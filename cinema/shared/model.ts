import { documentMetadataSchema, type Presentation } from "./presentation";
import {
  REACTION_VARIANTS,
  reactionVariants,
  type ReactionVariant,
} from "./reactions";
import { parsePlaylist, MAX_IMPORT_ITEMS, MAX_IMPORT_BYTES } from "./playlist";
import { z } from "zod";
import { spaceSchema, type Space } from "./spaces";
export { spaceSchema };
import {
  parseMediaURL,
  MAX_LOCAL_BYTES,
  supportedMimes,
  type MediaSource,
} from "./media";
export const seatingSchema = z.enum(["cinema", "sofa"]);
export const visibilitySchema = z.enum(["public", "private"]);
export const avatarSchema = z.enum(["male", "female"]);
export const appearanceSchema = z.object({
  clothing: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hair: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export type AvatarStyle = z.infer<typeof avatarSchema>;
export const nameSchema = z.string().trim().min(1).max(32);
export const fileMetadataSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  size: z.number().int().min(1).max(MAX_LOCAL_BYTES),
  mime: z.enum(supportedMimes),
});
export const reactionSchema = z.enum(["flowers", "applause", "sad", "troll"]);
export type ReactionKind = z.infer<typeof reactionSchema>;
export const REACTION_MS = 3000;
export const CONNECTION_LEASE_MS = 90000;
export const LEASE_RENEW_MS = 30000;
export const RECONNECT_GRACE_MS = 30000;
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    text: z
      .string()
      .trim()
      .min(1)
      .refine((s) => [...s.normalize("NFC")].length <= 500),
  }),
  z.object({ type: z.literal("accept"), id: z.string() }),
  z.object({ type: z.literal("reject"), id: z.string() }),
  z.object({ type: z.literal("kick"), id: z.string() }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("transfer"), id: z.string() }),
  z.object({ type: z.literal("successor"), id: z.string().nullable() }),
  z.object({ type: z.literal("close") }),
  z.object({ type: z.literal("rotate-invite") }),
  z.object({
    type: z.literal("import"),
    urls: z
      .array(z.string().max(2048))
      .min(1)
      .max(MAX_IMPORT_ITEMS)
      .refine(
        (urls) =>
          new TextEncoder().encode(urls.join("\n")).length <= MAX_IMPORT_BYTES,
      ),
    mode: z.enum(["start", "queue"]),
    generation: z.number().int().min(0),
    expectedQueueRevision: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("move"),
    id: z.string().max(100),
    beforeId: z.string().max(100).nullable(),
    expectedQueueRevision: z.number().int().min(0),
  }),
  z.object({ type: z.literal("add"), url: z.string().max(2048) }),
  z.object({
    type: z.literal("file"),
    file: fileMetadataSchema,
    mode: z.enum(["start", "queue"]),
    generation: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("start"),
    url: z.string().max(2048),
    generation: z.number().int(),
  }),
  z.object({
    type: z.literal("look"),
    yaw: z.number().min(-75).max(75),
    pitch: z.number().min(-45).max(35),
    bodyYaw: z.union([z.literal(0), z.literal(180)]),
  }),
  z.object({
    type: z.literal("remove"),
    id: z.string(),
    expectedQueueRevision: z.number().int().min(0).optional(),
  }),
  z.object({
    type: z.literal("reorder"),
    id: z.string(),
    direction: z.enum(["up", "down"]),
    expectedQueueRevision: z.number().int().min(0),
  }),
  z.object({ type: z.literal("suggest"), url: z.string().max(2048) }),
  z.object({
    type: z.literal("review-suggestion"),
    id: z.string(),
    accept: z.boolean(),
    expectedQueueRevision: z.number().int().min(0),
  }),
  z.object({ type: z.literal("next"), generation: z.number().int() }),
  z.object({ type: z.literal("play"), generation: z.number().int() }),
  z.object({ type: z.literal("pause"), generation: z.number().int() }),
  z.object({ type: z.literal("wait"), generation: z.number().int() }),
  z.object({ type: z.literal("ready"), generation: z.number().int() }),
  z.object({ type: z.literal("resume"), generation: z.number().int() }),
  z.object({
    type: z.literal("seek"),
    generation: z.number().int(),
    position: z.number().min(0).max(86400),
  }),
  z.object({ type: z.literal("sit"), instant: z.boolean().optional() }),
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("wave") }),
  z.object({
    type: z.literal("reaction"),
    kind: reactionSchema,
    variant: z.enum(REACTION_VARIANTS).optional(),
  }),
  z.object({
    type: z.literal("present"),
    file: documentMetadataSchema,
    expectedRevision: z.number().int().min(0),
    generation: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("slide"),
    fileId: z.string().uuid(),
    page: z.number().int().min(1).max(200),
    expectedRevision: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("stop-presentation"),
    fileId: z.string().uuid(),
    expectedRevision: z.number().int().min(1),
  }),
  z.object({ type: z.literal("poke"), id: z.string().min(1).max(128) }),
]);
export type Command = z.infer<typeof commandSchema>;
export type Member = {
  id: string;
  name: string;
  seat: number;
  seated: boolean;
  sitAt?: number;
  waveAt?: number;
  pokeAt?: number;
  lastReactionAt?: number;
  pokedAt?: number;
  pokedBy?: string;
  avatar?: AvatarStyle;
  appearance?: Appearance;
  lastSuggestedAt?: number;
  joinedAt: number;
  deadline?: number;
  connectionId?: string;
  leaseUntil?: number;
  online?: boolean;
  look?: { yaw: number; pitch: number; bodyYaw: 0 | 180 };
};
export type Item = { id: string; videoId: string; source?: MediaSource };
export type Suggestion = {
  source?: MediaSource;
  id: string;
  videoId: string;
  memberId: string;
  name: string;
  at: number;
};
export type Room = {
  presentation?: Presentation;
  presentationRevision?: number;
  space?: Space;
  seating?: z.infer<typeof seatingSchema>;
  visibility?: z.infer<typeof visibilitySchema>;
  inviteKey?: string;
  session: string;
  title: string;
  capacity: number;
  host: string;
  successor?: string;
  emptySince?: number;
  members: Member[];
  pending: {
    id: string;
    name: string;
    at: number;
    avatar?: AvatarStyle;
    appearance?: Appearance;
  }[];
  banned: string[];
  queue: Item[];
  queueRevision?: number;
  suggestions?: Suggestion[];
  current: Item | null;
  generation: number;
  queueEndedAt?: number;
  waiting?: string[];
  readinessPaused?: boolean;
  playing: boolean;
  position: number;
  anchor: number;
  reaction?: {
    id: string;
    kind: ReactionKind;
    variant?: ReactionVariant;
    memberId?: string;
    name?: string;
    at: number;
  };
  messages: {
    id: string;
    senderId?: string;
    at?: number;
    name: string;
    text: string;
    clientMessageId?: string;
  }[];
  revision: number;
  expires: number;
};
const seatCache = new Map<
  number,
  { id: number; x: number; y: number; z: number }[]
>();
export function seats(n: number) {
  if (!Number.isInteger(n) || n < 2 || n > 10) throw Error("CAPACITY");
  const cached = seatCache.get(n);
  if (cached) return cached;
  const rows =
    n < 6
      ? [n]
      : n <= 8
        ? [Math.ceil(n / 2), Math.floor(n / 2)]
        : [
            Math.ceil(n / 3),
            Math.ceil((n - Math.ceil(n / 3)) / 2),
            Math.floor((n - Math.ceil(n / 3)) / 2),
          ];
  let id = 0;
  const result = rows.flatMap((count, row) =>
    Array.from({ length: count }, (_, i) => {
      const x = (i - (count - 1) / 2) * 1.25;
      return { id: id++, x, y: row * 0.5, z: row * 2.2 - 0.4 };
    }),
  );
  result.forEach(Object.freeze);
  Object.freeze(result);
  seatCache.set(n, result);
  return result;
}
export function videoId(input: string) {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw Error("INVALID_YOUTUBE_URL");
  }
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("INVALID_YOUTUBE_URL");
  let id = "";
  if (u.hostname === "youtu.be") id = u.pathname.slice(1);
  else if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
  ) {
    id =
      u.pathname === "/watch"
        ? u.searchParams.get("v") || ""
        : u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)$/)?.[1] || "";
  }
  if (!/^[\w-]{11}$/.test(id)) throw Error("INVALID_YOUTUBE_URL");
  return id;
}
export function target(room: Room, now: number) {
  return Math.max(
    0,
    room.position + (room.playing ? (now - room.anchor) / 1000 : 0),
  );
}
export function createRoom(
  id: string,
  name: string,
  title: string,
  capacity: number,
  now: number,
  avatar: AvatarStyle = "male",
  visibility: z.infer<typeof visibilitySchema> = "public",
  seating: z.infer<typeof seatingSchema> = "cinema",
  appearance?: Appearance,
  space: Space = "cinema",
): Room {
  seats(capacity);
  return {
    session: crypto.randomUUID(),
    visibility: visibilitySchema.parse(visibility),
    seating: seatingSchema.parse(seating),
    space: spaceSchema.parse(space),
    ...(visibility === "private" ? { inviteKey: crypto.randomUUID() } : {}),
    title: nameSchema.parse(title),
    capacity,
    host: id,
    members: [
      {
        id,
        name: nameSchema.parse(name),
        seat: 0,
        seated: false,
        avatar: avatarSchema.parse(avatar),
        appearance: appearanceSchema.optional().parse(appearance),
        joinedAt: now,
        deadline: now + 20000,
      },
    ],
    pending: [],
    banned: [],
    queue: [],
    queueRevision: 0,
    suggestions: [],
    current: null,
    generation: 0,
    playing: false,
    position: 0,
    anchor: now,
    messages: [],
    revision: 0,
    expires: now + 86400000,
  };
}
export function requestJoin(
  r: Room,
  id: string,
  name: string,
  now: number,
  avatar: AvatarStyle = "male",
  inviteKey?: string,
  appearance?: Appearance,
) {
  if (r.banned.includes(id)) throw Error("BANNED");
  if (r.members.some((m) => m.id === id)) return;
  if (r.pending.some((m) => m.id === id)) return;
  if (hostRecovering(r)) throw Error("HOST_RECONNECTING");
  if (r.visibility === "private" && (!r.inviteKey || inviteKey !== r.inviteKey))
    throw Error("INVITE_REQUIRED");
  if (r.members.length >= r.capacity) throw Error("ROOM_FULL");
  if (r.pending.length >= 20) throw Error("REQUEST_QUEUE_FULL");
  r.pending.push({
    id,
    name: nameSchema.parse(name),
    at: now,
    avatar: avatarSchema.parse(avatar),
    appearance: appearanceSchema.optional().parse(appearance),
  });
  r.revision++;
}
function clearPresentation(r: Room) {
  if (!r.presentation) return;
  r.presentationRevision =
    (r.presentationRevision || r.presentation.revision) + 1;
  delete r.presentation;
}
export function apply(r: Room, actor: string, c: Command, now: number) {
  const member = r.members.find((m) => m.id === actor);
  if (!member) throw Error("FORBIDDEN");
  if (
    ![
      "chat",
      "sit",
      "leave",
      "ping",
      "look",
      "wave",
      "poke",
      "reaction",
      "suggest",
      "wait",
      "ready",
    ].includes(c.type) &&
    actor !== r.host
  )
    throw Error("HOST_ONLY");
  if (
    r.presentation &&
    ["next", "play", "pause", "seek", "resume", "wait"].includes(c.type)
  )
    throw Error("PRESENTATION_ACTIVE");
  const checkQueue = (expected: number | undefined) => {
    if (expected !== undefined && expected !== (r.queueRevision || 0))
      throw Error("STALE_QUEUE");
  };
  const bumpQueue = () => {
    r.queueRevision = (r.queueRevision || 0) + 1;
  };
  if (c.type === "present") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
    if (c.expectedRevision !== (r.presentationRevision || 0))
      throw Error("STALE_PRESENTATION");
    const file = documentMetadataSchema.parse(c.file);
    if (file.mime !== "application/pdf" && file.pages !== 1)
      throw Error("INVALID_DOCUMENT");
    if (
      [r.current, ...r.queue].some(
        (i) => i?.source?.kind === "local" && i.source.fileId === file.fileId,
      ) ||
      r.presentation?.source.fileId === file.fileId
    )
      throw Error("INVALID_DOCUMENT");
    r.position = target(r, now);
    r.anchor = now;
    r.playing = false;
    r.waiting = [];
    delete r.readinessPaused;
    r.presentationRevision = (r.presentationRevision || 0) + 1;
    r.presentation = {
      source: { ...file, kind: "document", ownerId: actor },
      page: 1,
      revision: r.presentationRevision,
    };
    r.revision++;
    return;
  }
  if (c.type === "slide" || c.type === "stop-presentation") {
    const p = r.presentation;
    if (!p || p.source.fileId !== c.fileId || p.revision !== c.expectedRevision)
      throw Error("STALE_PRESENTATION");
    if (c.type === "stop-presentation") clearPresentation(r);
    else {
      if (c.page > p.source.pages) throw Error("INVALID_DOCUMENT_PAGE");
      p.page = c.page;
      p.revision++;
      r.presentationRevision = p.revision;
    }
    r.revision++;
    return;
  }
  if (c.type === "wait" || c.type === "ready" || c.type === "resume") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
    if (!r.current) throw Error("NO_VIDEO");
    const waiting = (r.waiting || []).filter((id) =>
      r.members.some((m) => m.id === id),
    );
    if (c.type === "wait") {
      if (waiting.includes(actor)) return;
      r.waiting = [...waiting, actor];
      r.readinessPaused = true;
      r.position = target(r, now);
      r.anchor = now;
      r.playing = false;
    } else if (c.type === "ready")
      r.waiting = waiting.filter((id) => id !== actor);
    else {
      clearPresentation(r);
      r.waiting = [];
      delete r.readinessPaused;
      r.position = target(r, now);
      r.anchor = now;
      r.playing = true;
    }
    r.revision++;
    return;
  }
  if (c.type === "ping") return;
  if (c.type === "chat") {
    r.messages.push({
      id: crypto.randomUUID(),
      name: member.name,
      text: c.text.normalize("NFC"),
      senderId: actor,
      at: now,
    });
    r.messages = r.messages.slice(-100);
  } else if (c.type === "suggest") {
    const suggestions = r.suggestions || [];
    const parsed = parseMediaURL(c.url);
    const vid = parsed.videoId;
    if (
      suggestions.filter((s) => s.memberId === actor).length >= 3 ||
      suggestions.length >= 30
    )
      throw Error("SUGGESTION_LIMIT");
    if (
      member.lastSuggestedAt !== undefined &&
      now - member.lastSuggestedAt < 10000
    )
      throw Error("SUGGESTION_COOLDOWN");
    if (
      suggestions.some(
        (s) =>
          s.memberId === actor &&
          JSON.stringify(
            s.source || { kind: "youtube", videoId: s.videoId },
          ) === JSON.stringify(parsed.source),
      )
    )
      throw Error("DUPLICATE_SUGGESTION");
    r.suggestions = [
      ...suggestions,
      {
        id: crypto.randomUUID(),
        videoId: vid,
        source: parsed.source,
        memberId: actor,
        name: member.name,
        at: now,
      },
    ];
    member.lastSuggestedAt = now;
  } else if (c.type === "review-suggestion") {
    const proposed = (r.suggestions || []).find((s) => s.id === c.id);
    if (!proposed) throw Error("INVALID_SUGGESTION");
    if (c.accept) {
      checkQueue(c.expectedQueueRevision);
      if (r.queue.length >= 50) throw Error("QUEUE_FULL");
      r.queue.push({
        id: crypto.randomUUID(),
        videoId: proposed.videoId,
        ...(proposed.source ? { source: proposed.source } : {}),
      });
      bumpQueue();
    }
    r.suggestions = (r.suggestions || []).filter((s) => s.id !== c.id);
  } else if (c.type === "rotate-invite") {
    if (r.visibility !== "private") throw Error("NOT_PRIVATE_ROOM");
    r.inviteKey = crypto.randomUUID();
    r.pending = [];
  } else if (c.type === "import") {
    checkQueue(c.expectedQueueRevision);
    const parsed = parsePlaylist(c.urls);
    if (c.mode === "start") {
      if (c.generation !== r.generation) throw Error("STALE_GENERATION");
      if (r.current || r.queue.length) throw Error("VIDEO_ALREADY_SELECTED");
    }
    if (r.queue.length + parsed.items.length > 50) throw Error("QUEUE_FULL");
    const items = parsed.items.map((item) => ({
      id: crypto.randomUUID(),
      ...item,
    }));
    if (c.mode === "start") {
      r.current = items.shift()!;
      r.generation++;
      r.position = 0;
      r.anchor = now;
      r.playing = true;
      delete r.queueEndedAt;
    }
    r.queue.push(...items);
    bumpQueue();
  } else if (c.type === "move") {
    checkQueue(c.expectedQueueRevision);
    const index = r.queue.findIndex((i) => i.id === c.id);
    if (
      index < 0 ||
      (c.beforeId !== null && !r.queue.some((i) => i.id === c.beforeId))
    )
      throw Error("INVALID_QUEUE_ITEM");
    if (c.id === c.beforeId) return;
    const item = r.queue.splice(index, 1)[0];
    const destination =
      c.beforeId === null
        ? r.queue.length
        : r.queue.findIndex((i) => i.id === c.beforeId);
    r.queue.splice(destination, 0, item);
    bumpQueue();
  } else if (c.type === "reorder") {
    checkQueue(c.expectedQueueRevision);
    const index = r.queue.findIndex((i) => i.id === c.id);
    if (index < 0) throw Error("INVALID_QUEUE_ITEM");
    const next = index + (c.direction === "up" ? -1 : 1);
    if (next < 0 || next >= r.queue.length) return;
    [r.queue[index], r.queue[next]] = [r.queue[next], r.queue[index]];
    bumpQueue();
  } else if (c.type === "wave") {
    if (member.waveAt !== undefined && now - member.waveAt < 2400) return;
    member.waveAt = now;
  } else if (c.type === "reaction") {
    if (c.variant && reactionVariants[c.variant].kind !== c.kind)
      throw Error("INVALID_REACTION");
    if (r.reaction && now < r.reaction.at + REACTION_MS)
      throw Error("REACTION_BUSY");
    if (
      member.lastReactionAt !== undefined &&
      now - member.lastReactionAt < 5000
    )
      throw Error("REACTION_COOLDOWN");
    member.lastReactionAt = now;
    r.reaction = {
      id: crypto.randomUUID(),
      kind: c.kind,
      ...(c.variant ? { variant: c.variant } : {}),
      memberId: actor,
      name: member.name,
      at: now,
    };
  } else if (c.type === "poke") {
    const friend = r.members.find((m) => m.id === c.id && m.id !== actor);
    if (!friend) throw Error("INVALID_TARGET");
    if (member.pokeAt !== undefined && now - member.pokeAt < 3000) return;
    member.pokeAt = now;
    friend.pokedAt = now;
    friend.pokedBy = actor;
  } else if (c.type === "look") {
    member.look = { yaw: c.yaw, pitch: c.pitch, bodyYaw: c.bodyYaw };
  } else if (c.type === "sit") {
    member.seated = true;
    member.sitAt = now - (c.instant ? 5000 : 0);
  } else if (c.type === "leave") {
    if (actor === r.host) throw Error("HOST_CLOSE_REQUIRED");
    r.members = r.members.filter((m) => m.id !== actor);
    r.suggestions = (r.suggestions || []).filter((s) => s.memberId !== actor);
  } else if (c.type === "transfer" || c.type === "successor") {
    if (c.type === "successor" && c.id === null) {
      delete r.successor;
    } else {
      const next = r.members.find((m) => m.id === c.id && m.id !== actor);
      if (!next?.connectionId) throw Error("TARGET_OFFLINE");
      if (c.type === "transfer") {
        r.host = next.id;
        delete r.successor;
      } else r.successor = next.id;
    }
  } else if (c.type === "accept") {
    const p = r.pending.find((p) => p.id === c.id && now - p.at < 120000);
    if (!p) throw Error("REQUEST_EXPIRED");
    if (r.members.length >= r.capacity) throw Error("ROOM_FULL");
    const seat = Array.from({ length: r.capacity }, (_, i) => i).find(
      (i) => !r.members.some((m) => m.seat === i),
    )!;
    r.members.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar || "male",
      appearance: p.appearance,
      seat,
      seated: false,
      joinedAt: now,
      deadline: now + 20000,
    });
    r.pending = r.pending.filter((p) => p.id !== c.id);
  } else if (c.type === "reject")
    r.pending = r.pending.filter((p) => p.id !== c.id);
  else if (c.type === "kick") {
    if (c.id === r.host) throw Error("CANNOT_KICK_HOST");
    r.members = r.members.filter((m) => m.id !== c.id);
    r.suggestions = (r.suggestions || []).filter((s) => s.memberId !== c.id);
    if (!r.banned.includes(c.id)) {
      if (r.banned.length >= 100) throw Error("BAN_LIMIT");
      r.banned.push(c.id);
    }
  } else if (c.type === "file") {
    const file = fileMetadataSchema.parse(c.file);
    const item: Item = {
      id: crypto.randomUUID(),
      videoId: "",
      source: {
        kind: "local",
        fileId: file.fileId!,
        name: file.name!,
        size: file.size!,
        mime: file.mime!,
        ownerId: actor,
      },
    };
    if (c.mode === "start") {
      if (c.generation !== r.generation) throw Error("STALE_GENERATION");
      if (r.current || r.queue.length) throw Error("VIDEO_ALREADY_SELECTED");
      r.current = item;
      delete r.queueEndedAt;
      r.generation++;
      r.position = 0;
      r.anchor = now;
      r.playing = true;
    } else {
      if (r.queue.length >= 50) throw Error("QUEUE_FULL");
      r.queue.push(item);
    }
    bumpQueue();
  } else if (c.type === "start") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
    if (r.current || r.queue.length) throw Error("VIDEO_ALREADY_SELECTED");
    const parsed = parseMediaURL(c.url);
    delete r.queueEndedAt;
    r.current = { id: crypto.randomUUID(), ...parsed };
    bumpQueue();
    r.generation++;
    r.position = 0;
    r.anchor = now;
    r.playing = true;
  } else if (c.type === "add") {
    if (r.queue.length >= 50) throw Error("QUEUE_FULL");
    r.queue.push({ id: crypto.randomUUID(), ...parseMediaURL(c.url) });
    bumpQueue();
  } else if (c.type === "remove") {
    checkQueue(c.expectedQueueRevision);
    const remaining = r.queue.filter((i) => i.id !== c.id);
    if (remaining.length === r.queue.length) return;
    r.queue = remaining;
    bumpQueue();
  } else if (c.type === "next") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
    clearPresentation(r);
    r.waiting = [];
    delete r.readinessPaused;
    const previous = r.current;
    r.current = r.queue.shift() || null;
    bumpQueue();
    if (previous && !r.current) r.queueEndedAt = now;
    if (r.current) delete r.queueEndedAt;
    r.generation++;
    r.position = 0;
    r.anchor = now;
    r.playing = !!r.current;
  } else if (["play", "pause", "seek"].includes(c.type)) {
    if (!("generation" in c) || c.generation !== r.generation)
      throw Error("STALE_GENERATION");
    if (!r.current) throw Error("NO_VIDEO");
    if (c.type === "play" && r.waiting?.length) throw Error("ROOM_WAITING");
    r.position = c.type === "seek" ? c.position : target(r, now);
    r.anchor = now;
    if (c.type === "play") {
      clearPresentation(r);
      r.playing = true;
      delete r.readinessPaused;
    }
    if (c.type === "pause") r.playing = false;
  }
  if (
    r.presentation &&
    !r.members.some((m) => m.id === r.presentation!.source.ownerId)
  )
    clearPresentation(r);
  if (r.waiting)
    r.waiting = r.waiting.filter((id) => r.members.some((m) => m.id === id));
  r.revision++;
}
export function hostRecovering(r: Room) {
  const host = r.members.find((m) => m.id === r.host);
  return !host || (!host.connectionId && host.leaseUntil !== undefined);
}
export function roomSummary(r: Room | null) {
  if (!r) return { open: false };
  if (r.visibility === "private") return { open: true, private: true };
  return {
    open: true,
    title: r.title,
    capacity: r.capacity,
    count: r.members.length,
    ...(r.space && r.space !== "cinema" ? { space: r.space } : {}),
    ...(hostRecovering(r) ? { recovering: true } : {}),
  };
}
export function view(r: Room, id: string) {
  if (
    r.visibility === "private" &&
    !r.members.some((m) => m.id === id) &&
    !r.pending.some((m) => m.id === id)
  )
    return { status: "removed" };
  const { inviteKey, ...publicRoom } = r;
  if (!r.members.some((m) => m.id === id))
    return {
      status: r.pending.some((p) => p.id === id) ? "pending" : "removed",
      title: r.title,
      session: r.session,
    };
  return {
    status: "joined",
    room: {
      ...publicRoom,
      ...(r.reaction
        ? {
            reaction: {
              id: r.reaction.id,
              kind: r.reaction.kind,
              ...(r.reaction.variant ? { variant: r.reaction.variant } : {}),
              at: r.reaction.at,
            },
          }
        : {}),
      ...(id === r.host && inviteKey ? { inviteKey } : {}),
      members: r.members.map(
        ({
          connectionId,
          leaseUntil,
          lastSuggestedAt,
          lastReactionAt,
          ...m
        }) => ({
          ...m,
          online: !!connectionId,
        }),
      ),
      banned: [],
      pending: id === r.host ? r.pending : [],
    },
  };
}

// Persist deadlines so a hibernating object can resume without background timers.
export function connectMember(
  r: Room,
  id: string,
  connectionId: string,
  now: number,
) {
  const m = r.members.find((m) => m.id === id);
  if (
    !m ||
    (m.deadline !== undefined && m.deadline <= now) ||
    (m.connectionId && m.leaseUntil !== undefined && m.leaseUntil <= now)
  )
    throw Error("MEMBERSHIP_EXPIRED");
  if (!m.seated) {
    m.seated = true;
    m.sitAt = now;
  }
  m.connectionId = connectionId;
  m.leaseUntil = now + CONNECTION_LEASE_MS;
  delete m.deadline;
  delete r.emptySince;
  r.revision++;
}
/** Renew only the current live connection, coalescing writes and never reviving an expired lease. */
export function renewMember(
  r: Room,
  id: string,
  connectionId: string,
  now: number,
) {
  const m = r.members.find((m) => m.id === id);
  if (
    !m ||
    m.connectionId !== connectionId ||
    (m.leaseUntil !== undefined && m.leaseUntil <= now)
  )
    throw Error("MEMBERSHIP_EXPIRED");
  if (
    m.leaseUntil !== undefined &&
    m.leaseUntil - now > CONNECTION_LEASE_MS - LEASE_RENEW_MS
  )
    return false;
  m.leaseUntil = now + CONNECTION_LEASE_MS;
  return true;
}
export function disconnectMember(
  r: Room,
  id: string,
  connectionId: string,
  now: number,
) {
  const m = r.members.find((m) => m.id === id);
  // A previous tab's close event must not disconnect its replacement.
  if (!m || m.connectionId !== connectionId) return false;
  delete m.connectionId;
  m.deadline = Math.min(now + RECONNECT_GRACE_MS, m.leaseUntil ?? Infinity);
  r.revision++;
  return true;
}
export function sweep(r: Room, now: number) {
  const before = r.revision;
  if (r.reaction && now >= r.reaction.at + REACTION_MS) {
    delete r.reaction;
    r.revision++;
  }
  const pending = r.pending.filter((p) => p.at + 120000 > now);
  if (pending.length !== r.pending.length) {
    r.pending = pending;
    r.revision++;
  }
  // Upgrade old persisted sockets once; thereafter a silent connection has a finite deadline.
  for (const m of r.members)
    if (m.connectionId && m.leaseUntil === undefined) {
      m.leaseUntil = now + CONNECTION_LEASE_MS;
      r.revision++;
    }
  const expired = r.members.filter(
    (m) =>
      (m.deadline !== undefined && m.deadline <= now) ||
      (!!m.connectionId && m.leaseUntil !== undefined && m.leaseUntil <= now),
  );
  if (expired.length) {
    r.members = r.members.filter((m) => !expired.includes(m));
    if (r.waiting)
      r.waiting = r.waiting.filter((id) => r.members.some((m) => m.id === id));
    r.suggestions = (r.suggestions || []).filter((s) =>
      r.members.some((m) => m.id === s.memberId),
    );
    if (expired.some((m) => m.id === r.host)) {
      const next = r.members.find(
        (m) => m.id === r.successor && m.connectionId,
      );
      r.host = next?.id || "";
      delete r.successor;
    }
    if (!r.members.some((m) => m.id === r.successor)) delete r.successor;
    r.revision++;
  }
  if (
    r.presentation &&
    !r.members.some((m) => m.id === r.presentation!.source.ownerId)
  ) {
    clearPresentation(r);
    r.revision++;
  }
  if (!r.members.length && r.emptySince === undefined) {
    r.emptySince = now;
    r.revision++;
  }
  if (r.members.length && r.emptySince !== undefined) {
    delete r.emptySince;
    r.revision++;
  }
  return {
    changed: r.revision !== before,
    closed:
      !r.members.some((m) => m.id === r.host) ||
      now >= r.expires ||
      (r.emptySince !== undefined && now >= r.emptySince + 60000),
  };
}
export function nextDeadline(r: Room) {
  return Math.min(
    r.expires,
    ...(r.reaction ? [r.reaction.at + REACTION_MS] : []),
    ...r.pending.map((p) => p.at + 120000),
    ...r.members.flatMap((m) => [
      ...(m.deadline === undefined ? [] : [m.deadline]),
      ...(m.connectionId && m.leaseUntil !== undefined ? [m.leaseUntil] : []),
    ]),
    ...(r.emptySince === undefined ? [] : [r.emptySince + 60000]),
  );
}
