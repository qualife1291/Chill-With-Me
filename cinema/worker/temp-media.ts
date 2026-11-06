/** Optional cache engine. Not wired into production until R2 is activated. */
import type { Room } from "../shared/model";
import {
  MAX_LOCAL_BYTES,
  supportedMimes,
  type LocalMedia,
} from "../shared/media";
export interface CacheLedger {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list<T>(options: { prefix: string }): Promise<Map<string, T>>;
}
export interface CacheBucket {
  put(
    key: string,
    body: ReadableStream<Uint8Array>,
    options: { httpMetadata: { contentType: string } },
  ): Promise<unknown>;
  get(
    key: string,
    options: { range: { offset: number; length: number } },
  ): Promise<{ body: ReadableStream<Uint8Array> } | null>;
  delete(key: string): Promise<unknown>;
}
export const CACHE_ROOM_BYTES = 250 * 1024 * 1024,
  CACHE_TTL = 6 * 60 * 60 * 1000;
export type CacheRecord = {
  key: string;
  epoch: string;
  fileId: string;
  size: number;
  mime: string;
  status: "uploading" | "ready" | "deleting";
  expires: number;
  retryAt: number;
  attempts: number;
};
const PREFIX = "media-cache:";
/** Only current + next are eligible, and duplicate references share the same object. */
export function cacheCandidates(room: Room | null) {
  const result = new Map<string, LocalMedia>();
  for (const item of [room?.current, room?.queue[0]])
    if (item?.source?.kind === "local")
      result.set(item.source.fileId, item.source);
  return result;
}
function member(room: Room, actor: string, now: number) {
  if (
    room.expires <= now ||
    !room.members.some(
      (m) => m.id === actor && (m.deadline === undefined || m.deadline > now),
    )
  )
    throw Error("FORBIDDEN");
}
export function byteRange(value: string | null, size: number) {
  if (!value) return { offset: 0, length: size, partial: false };
  const m = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) throw Error("INVALID_RANGE");
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1]
    ? m[2]
      ? Math.min(Number(m[2]), size - 1)
      : size - 1
    : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start ||
    (!m[1] && Number(m[2]) === 0)
  )
    throw Error("INVALID_RANGE");
  return { offset: start, length: end - start + 1, partial: true };
}
export class TempMediaCache {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(
    private ledger: CacheLedger,
    private bucket: CacheBucket,
    private scope: "slot-1" | "slot-2" | "slot-3",
  ) {}
  private locked<T>(job: () => Promise<T>): Promise<T> {
    const next = this.serial.catch(() => {}).then(job);
    this.serial = next;
    return next;
  }
  private id(epoch: string, fileId: string) {
    return PREFIX + epoch + ":" + fileId;
  }
  async upload(
    room: Room,
    actor: string,
    fileId: string,
    body: ReadableStream<Uint8Array>,
    now: number,
  ) {
    return this.locked(async () => {
      member(room, actor, now);
      const source = cacheCandidates(room).get(fileId);
      if (!source || source.ownerId !== actor) throw Error("FORBIDDEN");
      if (
        !source.size ||
        source.size > MAX_LOCAL_BYTES ||
        !supportedMimes.includes(source.mime)
      )
        throw Error("INVALID_FILE");
      const id = this.id(room.session, fileId),
        existing = await this.ledger.get<CacheRecord>(id);
      if (existing) throw Error("CACHE_ALREADY_RESERVED");
      const entries = await this.ledger.list<CacheRecord>({ prefix: PREFIX });
      if (
        [...entries.values()].reduce((sum, r) => sum + r.size, 0) +
          source.size >
        CACHE_ROOM_BYTES
      )
        throw Error("CACHE_QUOTA");
      const record: CacheRecord = {
        key: `${this.scope}/${crypto.randomUUID()}`,
        epoch: room.session,
        fileId,
        size: source.size,
        mime: source.mime,
        status: "uploading",
        expires: now + 15 * 60 * 1000,
        retryAt: 0,
        attempts: 0,
      };
      await this.ledger.put(id, record); // Persist reservation before network I/O, including crash cleanup.
      let received = 0;
      const bounded = body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            received += chunk.byteLength;
            if (received > source.size) throw Error("UPLOAD_TOO_LARGE");
            controller.enqueue(chunk);
          },
          flush() {
            if (received !== source.size) throw Error("UPLOAD_INCOMPLETE");
          },
        }),
      );
      try {
        await this.bucket.put(record.key, bounded, {
          httpMetadata: { contentType: source.mime },
        });
        if (received !== source.size) throw Error("UPLOAD_INCOMPLETE");
        record.status = "ready";
        record.expires = now + CACHE_TTL;
        await this.ledger.put(id, record);
      } catch (e) {
        record.status = "deleting";
        record.retryAt = now;
        await this.ledger.put(id, record);
        await this.remove(id, record, now);
        throw e;
      }
      return { fileId, size: record.size, expires: record.expires };
    });
  }
  async read(
    room: Room,
    actor: string,
    fileId: string,
    range: string | null,
    now: number,
  ) {
    member(room, actor, now);
    if (!cacheCandidates(room).has(fileId))
      return new Response("Not found", { status: 404 });
    const record = await this.ledger.get<CacheRecord>(
      this.id(room.session, fileId),
    );
    if (!record || record.status !== "ready" || record.expires <= now)
      return new Response("Not ready", { status: 404 });
    let selection: ReturnType<typeof byteRange>;
    try {
      selection = byteRange(range, record.size);
    } catch {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${record.size}`,
          "Cache-Control": "no-store",
        },
      });
    }
    const object = await this.bucket.get(record.key, {
      range: { offset: selection.offset, length: selection.length },
    });
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers({
      "Content-Type": record.mime,
      "Content-Length": String(selection.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (selection.partial)
      headers.set(
        "Content-Range",
        `bytes ${selection.offset}-${selection.offset + selection.length - 1}/${record.size}`,
      );
    return new Response(object.body, {
      status: selection.partial ? 206 : 200,
      headers,
    });
  }
  /** Call after each room mutation AND from an alarm, even after room state is deleted. */
  async collect(room: Room | null, now: number) {
    return this.locked(async () => {
      const live =
        room && room.expires > now
          ? cacheCandidates(room)
          : new Map<string, LocalMedia>();
      for (const [id, record] of await this.ledger.list<CacheRecord>({
        prefix: PREFIX,
      })) {
        if (record.status === "deleting") {
          if (record.retryAt <= now) await this.remove(id, record, now);
          continue;
        }
        if (
          record.expires <= now ||
          record.epoch !== room?.session ||
          !live.has(record.fileId)
        ) {
          record.status = "deleting";
          record.retryAt = now;
          await this.ledger.put(id, record);
          await this.remove(id, record, now);
        }
      }
    });
  }
  private async remove(id: string, record: CacheRecord, now: number) {
    try {
      await this.bucket.delete(record.key);
      await this.ledger.delete(id);
    } catch {
      record.status = "deleting";
      record.attempts++;
      record.retryAt =
        now + Math.min(300000, 1000 * 2 ** Math.min(record.attempts, 8));
      await this.ledger.put(id, record);
    }
  }
  async nextAlarm() {
    const records = await this.ledger.list<CacheRecord>({ prefix: PREFIX });
    return records.size
      ? Math.min(
          ...[...records.values()].map((r) =>
            r.status === "deleting" ? r.retryAt : r.expires,
          ),
        )
      : null;
  }
}
