import type { Board, Mark } from "#shared/game";
import type { Series } from "#shared/series";

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PLAYER_NAME_MAX = 8;
const NAME_DISALLOWED = /[^\p{L}\p{N} _\-!?'".]/gu;

export const draftPlayerName = (raw: string): string =>
  raw
    .replace(NAME_DISALLOWED, "")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .slice(0, PLAYER_NAME_MAX);

export const cleanPlayerName = (raw: string): string => draftPlayerName(raw).trimEnd();

export const CHAT_MAX_LENGTH = 160;
export const CHAT_HISTORY = 50;

export const MOVE_TIMEOUT_MS = 60_000;
export const DISCONNECT_GRACE_MS = 30_000;
export const ROUND_PAUSE_MS = 2_600;
export const PRESENCE_MS = 10_000;
export const HEARTBEAT_MS = 20_000;
export const PONG_TIMEOUT_MS = 10_000;

type RoomStatus = "waiting" | "active" | "over";

export interface MultiPlayer {
  id: string;
  name: string;
  avatar: string;
  mark: Mark;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface ChatMessage {
  seq: number;
  from: string;
  text: string;
  moderated: boolean;
  at: number;
}

export interface RoomState {
  id: string;
  code: string;
  status: RoomStatus;
  round: number;
  board: Board;
  turn: Mark;
  series: Series;
  players: MultiPlayer[];
  lastMove: number | null;
  chat: ChatMessage[];
  rematch: Record<string, boolean>;
  notice: string | null;
  moveDeadline: number | null;
  nextRoundAt: number | null;
  version: number;
  createdAt: number;
  lastActiveAt: number;
}

export const playerOf = (room: RoomState, playerId: string): MultiPlayer | null =>
  room.players.find((player) => player.id === playerId) ?? null;

export const opponentOf = (room: RoomState, playerId: string): MultiPlayer | null => {
  for (const player of room.players) {
    if (player.id !== playerId) return player;
  }
  return null;
};

export const playerByMark = (room: RoomState, mark: Mark): MultiPlayer | null =>
  room.players.find((player) => player.mark === mark) ?? null;

export type ClientMessage =
  | { type: "hello"; playerId: string; name: string; avatar: string }
  | { type: "queue" }
  | { type: "create" }
  | { type: "join"; code: string }
  | { type: "move"; index: number }
  | { type: "chat"; text: string }
  | { type: "rematch" }
  | { type: "leave" }
  | { type: "pong" };

export type MultiErrorCode =
  | "bad_message"
  | "bad_hello"
  | "bad_join"
  | "not_ready"
  | "already_in_room"
  | "no_room"
  | "room_not_found"
  | "room_full"
  | "not_your_turn"
  | "illegal_move"
  | "chat_limited"
  | "server_error";

export type ServerMessage =
  | { type: "welcome"; selfId: string }
  | { type: "queued" }
  | { type: "presence"; online: number }
  | { type: "state"; room: RoomState }
  | { type: "left" }
  | { type: "error"; code: MultiErrorCode; message: string }
  | { type: "ping" };
