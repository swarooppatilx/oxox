import type { Board } from "#shared/game";
import type { Mood, MoveReply, Opponent, Reason } from "#shared/moves";

import { OPPONENT } from "@/players";

const OPPONENTS: readonly Opponent[] = ["jev", "minimax"];
const MOODS: readonly Mood[] = ["confident", "nervous", "smug", "gracious"];
const REASONS: readonly Reason[] = ["win", "block", "fork", "setup", "center", "corner", "edge"];

const FETCH_TIMEOUT_MS = 4000;

function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  signal.addEventListener("abort", () => controller.abort(), { once: true });
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

function isMoveReply(value: unknown, board: Board): value is MoveReply {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Record<string, unknown>;
  return (
    typeof reply.index === "number" &&
    Number.isInteger(reply.index) &&
    board[reply.index] === null &&
    typeof reply.threat === "boolean" &&
    OPPONENTS.includes(reply.source as Opponent) &&
    MOODS.includes(reply.mood as Mood) &&
    REASONS.includes(reply.reason as Reason)
  );
}

export async function requestMove(board: Board, signal: AbortSignal): Promise<MoveReply> {
  const response = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board, aiMark: OPPONENT }),
    signal: withTimeout(signal, FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Move request failed with status ${response.status}`);

  const reply: unknown = await response.json();
  if (!isMoveReply(reply, board)) throw new Error("Move request returned an invalid reply");
  return reply;
}
