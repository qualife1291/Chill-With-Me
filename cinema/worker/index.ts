import {
  unpackFileChunk,
  packFileChunk,
  MAX_RELAY_BYTES,
  CHUNK_BYTES,
} from "../shared/fileRelay";
import { fileSignalSchema } from "../shared/fileSignal";
import { DurableObject } from "cloudflare:workers";
import {
  apply,
  visibilitySchema,
  seatingSchema,
  roomSummary,
  avatarSchema,
  appearanceSchema,
  connectMember,
  disconnectMember,
  sweep,
  nextDeadline,
  commandSchema,
  createRoom,
  requestJoin,
  view,
  type Room,
} from "../shared/model";
import { z } from "zod";
const joinSchema = z.object({
  name: z.string().trim().min(1).max(32),
  avatar: avatarSchema.default("male"),
  appearance: appearanceSchema.optional(),
  session: z.string().optional(),
  inviteKey: z.string().uuid().optional(),
});
const createSchema = joinSchema.extend({
  title: z.string().trim().min(1).max(32),
  capacity: z.number().int().min(2).max(10),
  visibility: visibilitySchema.default("public"),
  seating: seatingSchema.default("cinema"),
});
const error = (code: string, status = 400) =>
  Response.json(
    { error: code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
async function body(req: Request, allowImport = false) {
  if (!req.body) throw Error("EMPTY_BODY");
  const reader = req.body.getReader();
  let data = "",
    bytes = 0;
  const dec = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > (allowImport ? 40960 : 4096)) {
      await reader.cancel();
      throw Error("PAYLOAD_TOO_LARGE");
    }
    data += dec.decode(value, { stream: true });
  }
  const value = JSON.parse(data + dec.decode());
  if (bytes > 4096 && value?.command?.type !== "import")
    throw Error("PAYLOAD_TOO_LARGE");
  return value;
}
async function identity(req: Request) {
  const cookie = req.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)cinema_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!cookie) return null;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(cookie),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export class RoomSlot extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, json TEXT NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS processed (id TEXT PRIMARY KEY, at INTEGER)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS throttle (id TEXT PRIMARY KEY, at INTEGER, count INTEGER)",
    );
  }
  read(): Room | null {
    const row = this.ctx.storage.sql
      .exec<{ json: string }>("SELECT json FROM state WHERE id=1")
      .toArray()[0];
    return row ? JSON.parse(row.json) : null;
  }
  schedule() {
    const r = this.read();
    if (r) this.ctx.waitUntil(this.ctx.storage.setAlarm(nextDeadline(r)));
  }
  cleanup(now = Date.now()) {
    const r = this.read();
    if (!r) return;
    const result = sweep(r, now);
    if (result.closed) this.ctx.storage.sql.exec("DELETE FROM state");
    else if (result.changed) this.save(r);
    if (result.changed || result.closed) this.send();
    if (result.changed) this.schedule();
  }
  save(r: Room) {
    // Attachments hold transfer cursors only; discard them when the item/membership changes.
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as {
        relay?: Record<
          string,
          { fileId: string; offset: number; requestedAt: number }
        >;
      };
      if (!a.relay) continue;
      const source = r.current?.source;
      a.relay = Object.fromEntries(
        Object.entries(a.relay).filter(
          ([id, v]) =>
            source?.kind === "local" &&
            source.fileId === v.fileId &&
            r.members.some((m) => m.id === id),
        ),
      );
      if (!Object.keys(a.relay).length) delete a.relay;
      ws.serializeAttachment(a);
    }
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO state(id,json) VALUES(1,?)",
      JSON.stringify(r),
    );
  }
  limit(id: string) {
    const now = Date.now(),
      row = this.ctx.storage.sql
        .exec<{ at: number; count: number }>(
          "SELECT at,count FROM throttle WHERE id=?",
          id,
        )
        .toArray()[0];
    if (row && now - row.at < 10000 && row.count >= 20)
      throw Error("RATE_LIMITED");
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO throttle(id,at,count) VALUES(?,?,?)",
      id,
      row && now - row.at < 10000 ? row.at : now,
      row && now - row.at < 10000 ? row.count + 1 : 1,
    );
    this.ctx.storage.sql.exec("DELETE FROM throttle WHERE at<?", now - 60000);
  }
  send() {
    const r = this.read();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as { id: string; session: string };
      try {
        if (
          !r ||
          a.session !== r.session ||
          !r.members.some((m) => m.id === a.id)
        ) {
          ws.send(JSON.stringify({ status: "removed" }));
          ws.close(4001, "Membership ended");
        } else
          ws.send(JSON.stringify({ ...view(r, a.id), serverTime: Date.now() }));
      } catch {
        ws.close(1011, "Reconnect");
      }
    }
  }
  async fetch(req: Request) {
    try {
      const id = req.headers.get("X-Member") || "",
        u = new URL(req.url),
        action = u.pathname.split("/").pop();
      const now = Date.now();
      this.cleanup(now);
      let r = this.read();
      if (r && r.expires < now) {
        this.ctx.storage.sql.exec("DELETE FROM state");
        r = null;
        this.send();
      }
      if (action === "summary") return Response.json(roomSummary(r));
      if (!id) return error("NO_SESSION", 401);
      if (req.method === "POST") {
        this.limit(id);
        const data = await body(req, action === "command");
        this.cleanup(Date.now());
        r = this.read();
        if (r) r.pending = r.pending.filter((p) => now - p.at < 120000);
        if (action === "create") {
          if (r) throw Error("SLOT_BUSY");
          const c = createSchema.parse(data);
          r = createRoom(
            id,
            c.name,
            c.title,
            c.capacity,
            now,
            c.avatar,
            c.visibility,
            c.seating,
            c.appearance,
          );
          this.save(r);
          this.schedule();
        } else {
          if (!r) throw Error("ROOM_CLOSED");
          if (action === "join") {
            const c = joinSchema.parse(data);
            if (c.session && c.session !== r.session)
              throw Error("INVITE_EXPIRED");
            requestJoin(
              r,
              id,
              c.name,
              now,
              c.avatar,
              c.inviteKey,
              c.appearance,
            );
            this.save(r);
          } else if (action === "cancel") {
            const c = z.object({ session: z.string() }).parse(data);
            if (c.session !== r.session) throw Error("STALE_SESSION");
            r.pending = r.pending.filter((p) => p.id !== id);
            r.revision++;
            this.save(r);
          } else if (action === "command") {
            const envelope = z
              .object({
                session: z.string(),
                commandId: z.string().uuid(),
                command: commandSchema,
              })
              .parse(data);
            if (envelope.session !== r.session) throw Error("STALE_SESSION");
            const prior = this.ctx.storage.sql
              .exec(
                "SELECT id FROM processed WHERE id=?",
                `${id}:${envelope.commandId}`,
              )
              .toArray();
            if (prior.length)
              return Response.json({ ...view(r, id), serverTime: now });
            const c = envelope.command;
            if (c.type === "close") {
              if (r.host !== id) throw Error("HOST_ONLY");
              this.ctx.storage.sql.exec("DELETE FROM state");
              this.send();
              return Response.json({ status: "removed" });
            }
            apply(r, id, c, now);
            if (c.type === "chat")
              r.messages[r.messages.length - 1].clientMessageId =
                envelope.commandId;
            this.ctx.storage.transactionSync(() => {
              this.save(r!);
              this.ctx.storage.sql.exec(
                "INSERT INTO processed(id,at) VALUES(?,?)",
                `${id}:${envelope.commandId}`,
                now,
              );
              this.ctx.storage.sql.exec(
                "DELETE FROM processed WHERE id NOT IN (SELECT id FROM processed ORDER BY at DESC LIMIT 200)",
              );
            });
          } else return error("NOT_FOUND", 404);
        }
        this.schedule();
        this.send();
        return Response.json({ ...view(r, id), serverTime: now });
      }
      if (!r) return error("ROOM_CLOSED", 404);
      if (action === "ws") {
        if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket")
          return error("UPGRADE_REQUIRED", 426);
        if (!r.members.some((m) => m.id === id)) return error("FORBIDDEN", 403);
        const connectionId = crypto.randomUUID();
        connectMember(r, id, connectionId, now);
        this.save(r);
        this.schedule();
        for (const old of this.ctx.getWebSockets(id))
          old.close(4002, "Opened in another tab");
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1], [id]);
        pair[1].serializeAttachment({ id, session: r.session, connectionId });
        this.send();
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      return Response.json({ ...view(r, id), serverTime: now });
    } catch (e) {
      return error(
        e instanceof z.ZodError
          ? "INVALID_INPUT"
          : e instanceof Error
            ? e.message
            : "FAILED",
      );
    }
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message instanceof ArrayBuffer) {
      if (message.byteLength > CHUNK_BYTES + 516) {
        ws.close(1009, "Payload too large");
        return;
      }
      try {
        const { header: h, bytes } = unpackFileChunk(message),
          r = this.read();
        const a = ws.deserializeAttachment() as {
          id: string;
          session: string;
          connectionId: string;
          relay?: Record<
            string,
            { fileId: string; offset: number; requestedAt: number }
          >;
        };
        const source = r?.current?.source;
        if (
          !r ||
          h.session !== r.session ||
          a.session !== r.session ||
          source?.kind !== "local" ||
          source.ownerId !== a.id ||
          source.fileId !== h.fileId ||
          source.size > MAX_RELAY_BYTES ||
          !h.to ||
          h.to === a.id ||
          !r.members.some(
            (m) => m.id === a.id && m.connectionId === a.connectionId,
          )
        )
          throw Error("FORBIDDEN");
        const progress = a.relay?.[h.to];
        if (
          !progress ||
          progress.fileId !== h.fileId ||
          progress.offset !== h.offset ||
          h.offset + bytes.byteLength > source.size
        )
          throw Error("INVALID_FILE_CHUNK");
        const peer = this.ctx.getWebSockets().find((peer) => {
          const p = peer.deserializeAttachment() as {
            id: string;
            session: string;
            connectionId: string;
          };
          return (
            p.id === h.to &&
            p.session === r.session &&
            r.members.some(
              (m) => m.id === p.id && m.connectionId === p.connectionId,
            )
          );
        });
        if (!peer) throw Error("FORBIDDEN");
        progress.offset += bytes.byteLength;
        ws.serializeAttachment(a);
        peer.send(
          packFileChunk(
            {
              session: r.session,
              fileId: h.fileId,
              from: a.id,
              offset: h.offset,
            },
            bytes,
          ),
        );
      } catch {
        try {
          ws.send(JSON.stringify({ type: "file-error" }));
        } catch {}
      }
      return;
    }
    if (
      typeof message !== "string" ||
      new TextEncoder().encode(message).length > 4096
    ) {
      ws.close(1009, "Payload too large");
      return;
    }
    if (message === "ping") {
      ws.send(JSON.stringify({ type: "pong", serverTime: Date.now() }));
      return;
    }
    let commandId: string | undefined, signalFileId: string | undefined;
    try {
      const a = ws.deserializeAttachment() as {
        id: string;
        session: string;
        connectionId: string;
        lastLookAt?: number;
      };
      const raw = JSON.parse(message);
      if (raw.type === "clock") {
        const probe = z.object({ nonce: z.string().uuid() }).parse(raw),
          r = this.read();
        if (
          !r ||
          r.session !== a.session ||
          !r.members.some(
            (m) => m.id === a.id && m.connectionId === a.connectionId,
          )
        )
          throw Error("FORBIDDEN");
        const limited = a as typeof a & { lastClockAt?: number };
        if (Date.now() - (limited.lastClockAt || 0) < 200) return;
        limited.lastClockAt = Date.now();
        ws.serializeAttachment(limited);
        ws.send(
          JSON.stringify({
            type: "clock",
            nonce: probe.nonce,
            session: r.session,
            serverTime: Date.now(),
          }),
        );
        return;
      }
      if (raw.type === "file-signal") {
        signalFileId =
          typeof raw.fileId === "string" ? raw.fileId.slice(0, 36) : "";
        const msg = fileSignalSchema.parse(raw),
          r = this.read();
        if (
          !r ||
          r.session !== a.session ||
          msg.session !== a.session ||
          !r.members.some(
            (m) => m.id === a.id && m.connectionId === a.connectionId,
          ) ||
          !r.members.some((m) => m.id === msg.to) ||
          msg.to === a.id
        )
          throw Error("FORBIDDEN");
        const source = r.current?.source;
        if (source?.kind !== "local" || source.fileId !== msg.fileId)
          throw Error("STALE_FILE");
        const owner = source.ownerId;
        if (
          (["offer", "relay-request", "relay-ack"].includes(msg.signal.type) &&
            msg.to !== owner) ||
          (["answer", "unavailable"].includes(msg.signal.type) &&
            a.id !== owner) ||
          (msg.signal.type === "ice" && a.id !== owner && msg.to !== owner)
        )
          throw Error("FORBIDDEN");
        const rate = a as typeof a & {
          fileWindow?: number;
          fileCount?: number;
        };
        if (Date.now() - (rate.fileWindow || 0) > 10000) {
          rate.fileWindow = Date.now();
          rate.fileCount = 0;
        }
        if ((rate.fileCount = (rate.fileCount || 0) + 1) > 120)
          throw Error("RATE_LIMIT");
        ws.serializeAttachment(rate);
        for (const peer of this.ctx.getWebSockets()) {
          const p = peer.deserializeAttachment() as {
            id: string;
            session: string;
            connectionId: string;
          };
          if (
            p.id === msg.to &&
            p.session === r.session &&
            r.members.some(
              (m) => m.id === p.id && m.connectionId === p.connectionId,
            )
          ) {
            if (msg.signal.type === "relay-request") {
              if (source.size > MAX_RELAY_BYTES) throw Error("FILE_TOO_LARGE");
              const attachment = peer.deserializeAttachment() as typeof p & {
                relay?: Record<
                  string,
                  { fileId: string; offset: number; requestedAt: number }
                >;
              };
              // Retry only after a short cooldown, bound concurrent transfers by room seats.
              const previous = attachment.relay?.[a.id];
              if (
                previous?.fileId === source.fileId &&
                Date.now() - previous.requestedAt < 10000
              )
                throw Error("RATE_LIMIT");
              attachment.relay = Object.fromEntries(
                Object.entries(attachment.relay || {}).filter(
                  ([id, v]) =>
                    v.fileId === source.fileId &&
                    r.members.some((m) => m.id === id),
                ),
              );
              attachment.relay[a.id] = {
                fileId: source.fileId,
                offset: 0,
                requestedAt: Date.now(),
              };
              peer.serializeAttachment(attachment);
            }
            try {
              peer.send(JSON.stringify({ ...msg, from: a.id, to: undefined }));
            } catch {}
          }
        }
        return;
      }
      if (raw.type === "look") {
        const pose = z
          .object({
            type: z.literal("look"),
            session: z.string(),
            yaw: z.number().min(-75).max(75),
            pitch: z.number().min(-45).max(35),
            bodyYaw: z.union([z.literal(0), z.literal(180)]),
          })
          .parse(raw);
        const r = this.read();
        if (
          !r ||
          r.session !== a.session ||
          pose.session !== a.session ||
          !r.members.some(
            (m) => m.id === a.id && m.connectionId === a.connectionId,
          )
        )
          throw Error("FORBIDDEN");
        if (Date.now() - (a.lastLookAt || 0) < 100) return;
        a.lastLookAt = Date.now();
        ws.serializeAttachment(a);
        const payload = JSON.stringify({
          type: "look",
          session: r.session,
          id: a.id,
          look: { yaw: pose.yaw, pitch: pose.pitch, bodyYaw: pose.bodyYaw },
        });
        for (const peer of this.ctx.getWebSockets()) {
          const p = peer.deserializeAttachment() as {
            id: string;
            session: string;
          };
          if (
            peer !== ws &&
            p.session === r.session &&
            r.members.some((m) => m.id === p.id)
          )
            try {
              peer.send(payload);
            } catch {}
        }
        return;
      }
      const envelope = z
        .object({
          session: z.string(),
          commandId: z.string().uuid(),
          command: commandSchema,
        })
        .parse(raw);
      commandId = envelope.commandId;
      const r = this.read();
      if (!r || r.session !== a.session || r.session !== envelope.session)
        throw Error("STALE_SESSION");
      if (
        !r.members.some(
          (m) => m.id === a.id && m.connectionId === a.connectionId,
        )
      )
        throw Error("FORBIDDEN");
      if (envelope.command.type !== "chat") throw Error("CHAT_ONLY");
      const previous = this.ctx.storage.sql
        .exec("SELECT id FROM processed WHERE id=?", `${a.id}:${commandId}`)
        .toArray();
      if (previous.length) {
        ws.send(JSON.stringify({ type: "ack", commandId }));
        return;
      }
      this.limit(a.id);
      apply(r, a.id, envelope.command, Date.now());
      const msg = r.messages[r.messages.length - 1];
      msg.clientMessageId = commandId;
      this.ctx.storage.transactionSync(() => {
        this.save(r);
        this.ctx.storage.sql.exec(
          "INSERT INTO processed(id,at) VALUES(?,?)",
          `${a.id}:${commandId}`,
          Date.now(),
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM processed WHERE id NOT IN (SELECT id FROM processed ORDER BY at DESC LIMIT 200)",
        );
      });
      const payload = JSON.stringify({
        type: "chat",
        message: msg,
        session: r.session,
        revision: r.revision,
        serverTime: Date.now(),
      });
      for (const peer of this.ctx.getWebSockets()) {
        const p = peer.deserializeAttachment() as {
          id: string;
          session: string;
        };
        if (p.session === r.session && r.members.some((m) => m.id === p.id))
          try {
            peer.send(payload);
          } catch {
            peer.close(1011, "Reconnect");
          }
      }
    } catch (e) {
      if (signalFileId !== undefined) {
        ws.send(JSON.stringify({ type: "file-error", fileId: signalFileId }));
        return;
      }
      ws.send(
        JSON.stringify({
          type: "command-error",
          commandId,
          error:
            e instanceof z.ZodError
              ? "INVALID_INPUT"
              : e instanceof Error
                ? e.message
                : "FAILED",
        }),
      );
    }
  }
  webSocketClose(ws: WebSocket) {
    const a = ws.deserializeAttachment() as {
      id: string;
      session: string;
      connectionId: string;
    };
    const r = this.read();
    if (
      r &&
      r.session === a.session &&
      disconnectMember(r, a.id, a.connectionId, Date.now())
    ) {
      this.save(r);
      this.schedule();
      this.send();
    }
    ws.close();
  }
  webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }
  alarm() {
    this.cleanup();
    this.schedule();
  }
}
export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    const origin = req.headers.get("Origin");
    if (
      (req.method !== "GET" || req.headers.get("Upgrade")) &&
      origin !== url.origin
    )
      return error("ORIGIN_DENIED", 403);
    if (url.pathname === "/api/session" && req.method === "POST") {
      const existing = await identity(req);
      if (existing) return Response.json({ id: existing });
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      const fake = new Request(req.url, {
        headers: { Cookie: `cinema_session=${token}` },
      });
      return Response.json(
        { id: await identity(fake) },
        {
          headers: {
            "Set-Cookie": `cinema_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (url.pathname === "/api/rooms" && req.method === "GET") {
      const summaries = await Promise.all(
        [1, 2, 3].map(async (n) => ({
          slot: n,
          ...((await (
            await env.ROOMS.getByName(`slot-${n}`).fetch(
              new Request("https://internal/summary"),
            )
          ).json()) as object),
        })),
      );
      return Response.json(summaries, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const match = url.pathname.match(
      /^\/api\/rooms\/([123])\/(create|join|cancel|state|command|ws)$/,
    );
    if (!match) return error("NOT_FOUND", 404);
    const id = await identity(req);
    if (!id) return error("NO_SESSION", 401);
    const headers = new Headers(req.headers);
    headers.set("X-Member", id);
    const response = await env.ROOMS.getByName(`slot-${match[1]}`).fetch(
      new Request(req, { headers }),
    );
    if (response.status === 101) return response;
    const h = new Headers(response.headers);
    h.set("Cache-Control", "no-store");
    h.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers: h });
  },
} satisfies ExportedHandler<Env>;
