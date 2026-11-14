import { initialOaq, sowOaq, oaqScores, type Oaq } from "./games/oaq";
import {
  secureBelow,
  shuffle,
  makeTicket,
  completeTicket,
  type RandomBelow,
} from "./games/loto";
export * from "./games/oaq";
export * from "./games/loto";
import { z } from "zod";
export const gameOperationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), kind: z.enum(["oaq", "loto"]) }),
  ...(
    [
      "join",
      "leave",
      "start",
      "pause",
      "resume",
      "draw",
      "claim",
      "publish",
      "close",
    ] as const
  ).map((action) => z.object({ action: z.literal(action) })),
  z.object({
    action: z.literal("sow"),
    pit: z.number().int().min(0).max(11),
    direction: z.union([z.literal(1), z.literal(-1)]),
  }),
]);
export const gameCommandSchema = z.object({
  type: z.literal("game"),
  expectedRevision: z.number().int().min(0),
  operation: gameOperationSchema,
});
export type GameCommand = z.infer<typeof gameCommandSchema>;
export type Game = {
  id: string;
  kind: "oaq" | "loto";
  rule: "oaq-cwm-1" | "loto-cwm-1";
  revision: number;
  phase: "lobby" | "playing" | "paused" | "finished";
  players: string[];
  pausedBy?: string;
  reason?: string;
  winners?: string[];
  oaq?: Oaq;
  drawn?: number[];
  lastDrawAt?: number;
  claiming?: boolean;
  ticket?: number[][];
  secrets?: { deck: number[]; tickets: Record<string, number[][]> };
};
type GameRoom = {
  host: string;
  members: { id: string }[];
  game?: Game;
  gameRevision?: number;
};
const eligible = (g: Game) =>
  g.players.filter(
    (p) =>
      !!g.secrets?.tickets[p] &&
      completeTicket(g.secrets.tickets[p], g.drawn || []),
  );
function finishLoto(g: Game) {
  const winners = eligible(g);
  if (!winners.length) throw Error("GAME_NOT_WINNING");
  g.winners = winners;
  g.phase = "finished";
  g.reason = "row-complete";
}
function removePlayer(g: Game, actor: string) {
  if (g.kind === "oaq" && g.phase !== "lobby" && g.phase !== "finished") {
    g.phase = "finished";
    g.reason = "player-left";
    g.winners = [];
    return;
  }
  g.players = g.players.filter((p) => p !== actor);
  if (g.secrets) delete g.secrets.tickets[actor];
  if (g.phase !== "lobby" && g.phase !== "finished") {
    if (g.kind === "oaq" || g.players.length < 2) {
      g.phase = "finished";
      g.reason = "player-left";
      g.winners = [];
    } else g.claiming = eligible(g).length > 0;
  }
}
export function gameView(game: Game, viewer: string): Game {
  const { secrets, ticket: ignored, ...visible } = game,
    ticket = secrets?.tickets[viewer];
  return {
    ...visible,
    ...(ticket ? { ticket: ticket.map((r) => [...r]) } : {}),
  };
}
/** Room admission/epoch/dedupe stay outside; game roles and CAS stay here. */
export function applyGame(
  room: GameRoom,
  actor: string,
  input: GameCommand,
  now: number,
  random: RandomBelow = secureBelow,
) {
  const c = gameCommandSchema.parse(input),
    op = c.operation;
  if (!room.members.some((m) => m.id === actor)) throw Error("FORBIDDEN");
  if (c.expectedRevision !== (room.gameRevision || 0))
    throw Error("STALE_GAME");
  const host = actor === room.host;
  if (
    ["open", "start", "draw", "publish", "close"].includes(op.action) &&
    !host
  )
    throw Error("HOST_ONLY");
  if (op.action === "open") {
    if (room.game) throw Error("GAME_ACTIVE");
    const kind = "kind" in op ? op.kind : "oaq";
    room.gameRevision = (room.gameRevision || 0) + 1;
    room.game = {
      id: crypto.randomUUID(),
      kind,
      rule: kind === "oaq" ? "oaq-cwm-1" : "loto-cwm-1",
      revision: room.gameRevision,
      phase: "lobby",
      players: [actor],
    };
    return;
  }
  if (!room.game) throw Error("NO_GAME");
  if (op.action === "close") {
    delete room.game;
    room.gameRevision = (room.gameRevision || 0) + 1;
    return;
  }
  const g = structuredClone(room.game),
    player = g.players.indexOf(actor);
  if (op.action === "join") {
    if (g.phase !== "lobby") throw Error("GAME_ALREADY_STARTED");
    if (player >= 0) throw Error("GAME_ALREADY_JOINED");
    if (g.players.length >= (g.kind === "oaq" ? 2 : 10))
      throw Error("GAME_FULL");
    g.players.push(actor);
  } else if (op.action === "leave") {
    if (player < 0) throw Error("GAME_PLAYER_ONLY");
    removePlayer(g, actor);
  } else if (op.action === "start") {
    if (g.phase !== "lobby" || g.players.length < 2)
      throw Error("GAME_NEED_PLAYERS");
    if (g.kind === "oaq") g.oaq = initialOaq();
    else {
      const tickets: Record<string, number[][]> = {},
        seen = new Set<string>();
      for (const p of g.players) {
        let card = makeTicket(random),
          attempts = 0;
        while (seen.has(JSON.stringify(card)) && attempts++ < 32)
          card = makeTicket(random);
        if (seen.has(JSON.stringify(card))) throw Error("GAME_RANDOM_FAILURE");
        seen.add(JSON.stringify(card));
        tickets[p] = card;
      }
      g.secrets = {
        tickets,
        deck: shuffle(
          Array.from({ length: 90 }, (_, i) => i + 1),
          random,
        ),
      };
      g.drawn = [];
    }
    g.phase = "playing";
  } else if (op.action === "pause") {
    if ((!host && player < 0) || g.phase !== "playing")
      throw Error("GAME_CANNOT_PAUSE");
    g.phase = "paused";
    g.pausedBy = actor;
  } else if (op.action === "resume") {
    if (g.phase !== "paused" || (!host && g.pausedBy !== actor))
      throw Error("GAME_CANNOT_RESUME");
    g.phase = "playing";
    delete g.pausedBy;
  } else {
    if (g.phase !== "playing") throw Error("GAME_NOT_PLAYING");
    if (op.action === "sow" && "pit" in op) {
      if (g.kind !== "oaq" || !g.oaq) throw Error("GAME_WRONG_KIND");
      if (player !== g.oaq.turn) throw Error("GAME_NOT_YOUR_TURN");
      g.oaq = sowOaq(g.oaq, op.pit, op.direction);
      if (g.oaq.end) {
        g.phase = "finished";
        g.reason = g.oaq.end;
        const s = oaqScores(g.oaq);
        g.winners =
          ["repetition", "turn-limit"].includes(g.reason) || s[0] === s[1]
            ? []
            : [g.players[s[0] > s[1] ? 0 : 1]];
      }
    } else if (op.action === "draw") {
      if (g.kind !== "loto" || !g.secrets || !g.drawn)
        throw Error("GAME_WRONG_KIND");
      if (g.claiming) throw Error("GAME_CLAIM_PENDING");
      if (g.lastDrawAt !== undefined && now - g.lastDrawAt < 3000)
        throw Error("GAME_DRAW_COOLDOWN");
      if (g.drawn.length >= 90) throw Error("GAME_DRAW_EMPTY");
      g.drawn.push(g.secrets.deck[g.drawn.length]);
      g.lastDrawAt = now;
      g.claiming = eligible(g).length > 0;
    } else if (op.action === "claim" || op.action === "publish") {
      if (g.kind !== "loto") throw Error("GAME_WRONG_KIND");
      if (op.action === "claim" && !eligible(g).includes(actor))
        throw Error("GAME_NOT_WINNING");
      finishLoto(g);
    } else throw Error("GAME_WRONG_KIND");
  }
  room.gameRevision = (room.gameRevision || 0) + 1;
  g.revision = room.gameRevision;
  room.game = g;
}
export function pruneGame(room: GameRoom) {
  if (!room.game || room.game.phase === "finished") return false;
  const gone = room.game.players.filter(
    (p) => !room.members.some((m) => m.id === p),
  );
  if (!gone.length) return false;
  const g = structuredClone(room.game);
  for (const p of gone) removePlayer(g, p);
  room.gameRevision = (room.gameRevision || 0) + 1;
  g.revision = room.gameRevision;
  room.game = g;
  return true;
}
