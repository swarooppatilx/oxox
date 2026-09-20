import { SERIES_LENGTH } from "#shared/config";
import { emptyBoard, isOver, other, play, winnerOf, type Mark } from "#shared/game";
import {
  CHAT_HISTORY,
  DISCONNECT_GRACE_MS,
  MOVE_TIMEOUT_MS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROUND_PAUSE_MS,
  opponentOf,
  playerByMark,
  playerOf,
  type MultiErrorCode,
  type MultiPlayer,
  type RoomState,
} from "#shared/multi";
import { emptySeries, gamesPlayed, recordGame } from "#shared/series";
import type { Identity } from "#server/identity";

export type Outcome =
  | { ok: true; change: boolean; remove?: boolean }
  | { ok: false; code: MultiErrorCode; message: string };

const changed: Outcome = { ok: true, change: true };
const unchanged: Outcome = { ok: true, change: false };
const removed: Outcome = { ok: true, change: false, remove: true };
const failure = (code: MultiErrorCode, message: string): Outcome => ({ ok: false, code, message });

export function makeRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)] ?? "X";
  }
  return code;
}

const makePlayer = (identity: Identity, mark: Mark): MultiPlayer => ({
  id: identity.id,
  name: identity.name,
  avatar: identity.avatar,
  mark,
  connected: true,
  disconnectedAt: null,
});

function baseRoom(id: string, code: string, players: MultiPlayer[], now: number): RoomState {
  return {
    id,
    code,
    status: "waiting",
    round: 0,
    board: emptyBoard(),
    turn: "X",
    series: { ...emptySeries },
    players,
    lastMove: null,
    chat: [],
    rematch: {},
    notice: null,
    moveDeadline: null,
    nextRoundAt: null,
    version: 0,
    createdAt: now,
    lastActiveAt: now,
  };
}

export function hostedRoom(id: string, code: string, host: Identity, now: number): RoomState {
  const room = baseRoom(id, code, [makePlayer(host, "X")], now);
  room.notice = `Invite code ${code}`;
  return room;
}

export function matchedRoom(
  id: string,
  code: string,
  first: Identity,
  second: Identity,
  now: number,
): RoomState {
  const room = baseRoom(id, code, [makePlayer(first, "X"), makePlayer(second, "O")], now);
  room.status = "active";
  room.notice = `${first.name} starts first.`;
  room.moveDeadline = now + MOVE_TIMEOUT_MS;
  return room;
}

function firstPlayerResult(room: RoomState, loserId: string): "win" | "loss" {
  return room.players[0]?.id === loserId ? "loss" : "win";
}

function finishRound(room: RoomState, now: number): void {
  room.moveDeadline = null;
  if (gamesPlayed(room.series) >= SERIES_LENGTH) {
    room.status = "over";
    room.notice = null;
    room.nextRoundAt = null;
  } else {
    room.nextRoundAt = now + ROUND_PAUSE_MS;
  }
}

function beginRound(room: RoomState, now: number): void {
  room.round += 1;
  room.board = emptyBoard();
  room.lastMove = null;
  room.turn = room.round % 2 === 0 ? "X" : "O";
  room.nextRoundAt = null;
  room.moveDeadline = now + MOVE_TIMEOUT_MS;
  const opener = playerByMark(room, room.turn);
  room.notice = opener ? `${opener.name} opens this page.` : null;
}

export function join(room: RoomState, identity: Identity, now: number): Outcome {
  const existing = playerOf(room, identity.id);
  if (existing) {
    existing.connected = true;
    existing.disconnectedAt = null;
    room.notice = opponentOf(room, identity.id) ? `${identity.name} is back.` : null;
    return changed;
  }
  const host = room.players[0];
  if (room.status !== "waiting" || room.players.length >= 2 || !host) {
    return failure("room_full", "That game already has two players.");
  }
  room.players.push(makePlayer(identity, other(host.mark)));
  room.status = "active";
  room.notice = `${identity.name} joins the game.`;
  room.moveDeadline = now + MOVE_TIMEOUT_MS;
  return changed;
}

export function applyMove(room: RoomState, playerId: string, index: number, now: number): Outcome {
  if (room.status !== "active") {
    return failure("not_your_turn", "The game isn't accepting moves.");
  }
  const player = playerOf(room, playerId);
  if (!player) return failure("no_room", "Join a game first.");
  if (room.turn !== player.mark) return failure("not_your_turn", "It isn't your turn yet.");
  if (isOver(room.board)) return failure("illegal_move", "That page is already finished.");
  if (room.board[index] !== null) {
    return failure("illegal_move", "That square is already drawn on.");
  }

  room.board = play(room.board, index, player.mark);
  room.lastMove = index;
  room.notice = null;

  if (isOver(room.board)) {
    const winner = winnerOf(room.board);
    const first = room.players[0];
    room.series = recordGame(
      room.series,
      winner ? (winner.mark === first?.mark ? "win" : "loss") : "draw",
    );
    finishRound(room, now);
  } else {
    room.turn = other(player.mark);
    room.moveDeadline = now + MOVE_TIMEOUT_MS;
  }
  return changed;
}

export function addChat(
  room: RoomState,
  playerId: string,
  text: string,
  moderated: boolean,
  now: number,
): Outcome {
  if (!playerOf(room, playerId)) return failure("no_room", "Join a game first.");
  const seq = (room.chat[room.chat.length - 1]?.seq ?? 0) + 1;
  room.chat = [...room.chat, { seq, from: playerId, text, moderated, at: now }].slice(
    -CHAT_HISTORY,
  );
  return changed;
}

export function requestRematch(room: RoomState, playerId: string, now: number): Outcome {
  const player = playerOf(room, playerId);
  if (!player) return failure("no_room", "Join a game first.");
  room.rematch[playerId] = true;
  const rival = opponentOf(room, playerId);
  if (rival && room.rematch[rival.id] === true) {
    for (const member of room.players) member.mark = other(member.mark);
    room.series = { ...emptySeries };
    room.round = 0;
    room.board = emptyBoard();
    room.lastMove = null;
    room.status = "active";
    room.turn = "X";
    room.rematch = {};
    room.notice = "Rematch! Good luck.";
    room.moveDeadline = now + MOVE_TIMEOUT_MS;
    room.nextRoundAt = null;
  } else {
    room.notice = `${player.name} wants a rematch.`;
  }
  return changed;
}

export function markDisconnected(room: RoomState, playerId: string, now: number): Outcome {
  const player = playerOf(room, playerId);
  if (!player || !player.connected) return unchanged;
  player.connected = false;
  player.disconnectedAt = now;
  return changed;
}

export function leave(room: RoomState, playerId: string): Outcome {
  const leaver = playerOf(room, playerId);
  if (!leaver) return unchanged;
  if (room.status === "waiting") return removed;

  leaver.connected = false;
  if (room.status === "active" && !isOver(room.board)) {
    room.series = recordGame(room.series, firstPlayerResult(room, leaver.id));
  }
  room.status = "over";
  room.notice = `${leaver.name} left the game.`;
  room.moveDeadline = null;
  room.nextRoundAt = null;

  const rival = opponentOf(room, playerId);
  return rival && !rival.connected ? removed : changed;
}

export function dueAt(room: RoomState): number | null {
  if (room.status === "over") return null;
  const deadlines: number[] = [];
  if (room.status === "active") {
    if (room.nextRoundAt !== null) deadlines.push(room.nextRoundAt);
    if (room.moveDeadline !== null) deadlines.push(room.moveDeadline);
  }
  for (const player of room.players) {
    if (!player.connected && player.disconnectedAt !== null) {
      deadlines.push(player.disconnectedAt + DISCONNECT_GRACE_MS);
    }
  }
  return deadlines.length > 0 ? Math.min(...deadlines) : null;
}

export function runDue(room: RoomState, now: number): Outcome {
  const absent = room.players.find(
    (player) =>
      !player.connected &&
      player.disconnectedAt !== null &&
      player.disconnectedAt + DISCONNECT_GRACE_MS <= now,
  );
  if (absent && room.status !== "over") {
    if (room.status === "waiting") return removed;
    if (!isOver(room.board)) {
      room.series = recordGame(room.series, firstPlayerResult(room, absent.id));
    }
    room.status = "over";
    room.notice = `${absent.name} didn't come back.`;
    room.moveDeadline = null;
    room.nextRoundAt = null;
    return changed;
  }

  if (room.status !== "active") return unchanged;

  if (room.nextRoundAt !== null && room.nextRoundAt <= now) {
    beginRound(room, now);
    return changed;
  }

  if (room.moveDeadline !== null && room.moveDeadline <= now && !isOver(room.board)) {
    const mover = playerByMark(room, room.turn);
    if (!mover) return unchanged;
    room.series = recordGame(room.series, firstPlayerResult(room, mover.id));
    room.notice = `${mover.name} ran out of time.`;
    finishRound(room, now);
    return changed;
  }

  return unchanged;
}
