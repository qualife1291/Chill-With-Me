import { z } from "zod";
export const avatarSchema = z.enum(["male", "female"]);
export type AvatarStyle = z.infer<typeof avatarSchema>;
export const nameSchema = z.string().trim().min(1).max(32);
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
  z.object({ type: z.literal("add"), url: z.string().max(300) }),
  z.object({
    type: z.literal("start"),
    url: z.string().max(300),
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
  z.object({ type: z.literal("suggest"), url: z.string().max(300) }),
  z.object({
    type: z.literal("review-suggestion"),
    id: z.string(),
    accept: z.boolean(),
    expectedQueueRevision: z.number().int().min(0),
  }),
  z.object({ type: z.literal("next"), generation: z.number().int() }),
  z.object({ type: z.literal("play"), generation: z.number().int() }),
  z.object({ type: z.literal("pause"), generation: z.number().int() }),
  z.object({
    type: z.literal("seek"),
    generation: z.number().int(),
    position: z.number().min(0).max(86400),
  }),
  z.object({ type: z.literal("sit"), instant: z.boolean().optional() }),
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("wave") }),
]);
export type Command = z.infer<typeof commandSchema>;
export type Member = {
  id: string;
  name: string;
  seat: number;
  seated: boolean;
  sitAt?: number;
  waveAt?: number;
  avatar?: AvatarStyle;
  lastSuggestedAt?: number;
  joinedAt: number;
  deadline?: number;
  connectionId?: string;
  online?: boolean;
  look?: { yaw: number; pitch: number; bodyYaw: 0 | 180 };
};
export type Item = { id: string; videoId: string };
export type Suggestion = {
  id: string;
  videoId: string;
  memberId: string;
  name: string;
  at: number;
};
export type Room = {
  session: string;
  title: string;
  capacity: number;
  host: string;
  successor?: string;
  emptySince?: number;
  members: Member[];
  pending: { id: string; name: string; at: number; avatar?: AvatarStyle }[];
  banned: string[];
  queue: Item[];
  queueRevision?: number;
  suggestions?: Suggestion[];
  current: Item | null;
  generation: number;
  queueEndedAt?: number;
  playing: boolean;
  position: number;
  anchor: number;
  messages: {
    id: string;
    name: string;
    text: string;
    clientMessageId?: string;
  }[];
  revision: number;
  expires: number;
};
export function seats(n: number) {
  if (!Number.isInteger(n) || n < 2 || n > 10) throw Error("CAPACITY");
  const rows =
    n <= 4
      ? [n]
      : n <= 8
        ? [Math.ceil(n / 2), Math.floor(n / 2)]
        : [
            Math.ceil(n / 3),
            Math.ceil((n - Math.ceil(n / 3)) / 2),
            Math.floor((n - Math.ceil(n / 3)) / 2),
          ];
  let id = 0;
  return rows.flatMap((count, row) =>
    Array.from({ length: count }, (_, i) => {
      const left = Math.floor(count / 2);
      const x = i < left ? -(left - i) * 1.05 - 0.35 : (i - left) * 1.05 + 1.4;
      return { id: id++, x, y: row * 0.5, z: row * 1.8 - 0.4 };
    }),
  );
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
): Room {
  seats(capacity);
  return {
    session: crypto.randomUUID(),
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
) {
  if (r.banned.includes(id)) throw Error("BANNED");
  if (r.members.some((m) => m.id === id)) return;
  if (r.pending.some((m) => m.id === id)) return;
  if (r.members.length >= r.capacity) throw Error("ROOM_FULL");
  if (r.pending.length >= 20) throw Error("REQUEST_QUEUE_FULL");
  r.pending.push({
    id,
    name: nameSchema.parse(name),
    at: now,
    avatar: avatarSchema.parse(avatar),
  });
  r.revision++;
}
export function apply(r: Room, actor: string, c: Command, now: number) {
  const member = r.members.find((m) => m.id === actor);
  if (!member) throw Error("FORBIDDEN");
  if (
    !["chat", "sit", "leave", "ping", "look", "wave", "suggest"].includes(
      c.type,
    ) &&
    actor !== r.host
  )
    throw Error("HOST_ONLY");
  const checkQueue = (expected: number | undefined) => {
    if (expected !== undefined && expected !== (r.queueRevision || 0))
      throw Error("STALE_QUEUE");
  };
  const bumpQueue = () => {
    r.queueRevision = (r.queueRevision || 0) + 1;
  };
  if (c.type === "ping") return;
  if (c.type === "chat") {
    r.messages.push({
      id: crypto.randomUUID(),
      name: member.name,
      text: c.text.normalize("NFC"),
    });
    r.messages = r.messages.slice(-100);
  } else if (c.type === "suggest") {
    const suggestions = r.suggestions || [];
    const vid = videoId(c.url);
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
    if (suggestions.some((s) => s.memberId === actor && s.videoId === vid))
      throw Error("DUPLICATE_SUGGESTION");
    r.suggestions = [
      ...suggestions,
      {
        id: crypto.randomUUID(),
        videoId: vid,
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
      r.queue.push({ id: crypto.randomUUID(), videoId: proposed.videoId });
      bumpQueue();
    }
    r.suggestions = (r.suggestions || []).filter((s) => s.id !== c.id);
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
  } else if (c.type === "start") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
    if (r.current || r.queue.length) throw Error("VIDEO_ALREADY_SELECTED");
    const vid = videoId(c.url);
    delete r.queueEndedAt;
    r.current = { id: crypto.randomUUID(), videoId: vid };
    bumpQueue();
    r.generation++;
    r.position = 0;
    r.anchor = now;
    r.playing = true;
  } else if (c.type === "add") {
    if (r.queue.length >= 50) throw Error("QUEUE_FULL");
    r.queue.push({ id: crypto.randomUUID(), videoId: videoId(c.url) });
    bumpQueue();
  } else if (c.type === "remove") {
    checkQueue(c.expectedQueueRevision);
    const remaining = r.queue.filter((i) => i.id !== c.id);
    if (remaining.length === r.queue.length) return;
    r.queue = remaining;
    bumpQueue();
  } else if (c.type === "next") {
    if (c.generation !== r.generation) throw Error("STALE_GENERATION");
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
    r.position = c.type === "seek" ? c.position : target(r, now);
    r.anchor = now;
    if (c.type === "play") r.playing = true;
    if (c.type === "pause") r.playing = false;
  }
  r.revision++;
}
export function view(r: Room, id: string) {
  if (!r.members.some((m) => m.id === id))
    return {
      status: r.pending.some((p) => p.id === id) ? "pending" : "removed",
      title: r.title,
      session: r.session,
    };
  return {
    status: "joined",
    room: {
      ...r,
      members: r.members.map(({ connectionId, lastSuggestedAt, ...m }) => ({
        ...m,
        online: !!connectionId,
      })),
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
  if (!m || (m.deadline !== undefined && m.deadline <= now))
    throw Error("MEMBERSHIP_EXPIRED");
  if (!m.seated) {
    m.seated = true;
    m.sitAt = now;
  }
  m.connectionId = connectionId;
  delete m.deadline;
  delete r.emptySince;
  r.revision++;
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
  m.deadline = now + 30000;
  r.revision++;
  return true;
}
export function sweep(r: Room, now: number) {
  const before = r.revision;
  const pending = r.pending.filter((p) => p.at + 120000 > now);
  if (pending.length !== r.pending.length) {
    r.pending = pending;
    r.revision++;
  }
  const expired = r.members.filter(
    (m) => m.deadline !== undefined && m.deadline <= now,
  );
  if (expired.length) {
    r.members = r.members.filter((m) => !expired.includes(m));
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
      now >= r.expires ||
      (r.emptySince !== undefined && now >= r.emptySince + 60000),
  };
}
export function nextDeadline(r: Room) {
  return Math.min(
    r.expires,
    ...r.pending.map((p) => p.at + 120000),
    ...r.members.flatMap((m) => (m.deadline === undefined ? [] : [m.deadline])),
    ...(r.emptySince === undefined ? [] : [r.emptySince + 60000]),
  );
}
