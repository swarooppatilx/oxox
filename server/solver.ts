import type { Board, Mark } from "../shared/game.js";
import { minimaxMove } from "../shared/minimax.js";
import { toReply, type MoveReply, type MoveResult } from "../shared/moves.js";
import { createAskJev } from "./jev.js";

const JEV_TIMEOUT_MS = 8000;
const JEV_COOLDOWN_MS = 60_000;
const MAX_CACHED_POSITIONS = 5000;

export function createSolver(apiKey: string | undefined) {
  const askJev = apiKey ? createAskJev(apiKey) : undefined;
  const answers = new Map<string, MoveResult>();
  let jevUnavailableUntil = 0;

  return async function solve(board: Board, ai: Mark): Promise<MoveReply> {
    const fromMinimax = () => toReply(board, ai, minimaxMove(board, ai), "minimax");

    const key = `${ai}:${board.map((cell) => cell ?? "-").join("")}`;
    const cached = answers.get(key);
    if (cached) return toReply(board, ai, cached, "jev");
    if (!askJev || Date.now() < jevUnavailableUntil) return fromMinimax();

    try {
      const answer = await askJev(board, ai, AbortSignal.timeout(JEV_TIMEOUT_MS));
      if (board[answer.index] !== null) throw new Error("Jev chose an unavailable cell");

      if (answers.size >= MAX_CACHED_POSITIONS) answers.clear();
      answers.set(key, answer);
      return toReply(board, ai, answer, "jev");
    } catch (error) {
      jevUnavailableUntil = Date.now() + JEV_COOLDOWN_MS;
      console.error("[jev] unavailable, using minimax for a minute:", error);
      return fromMinimax();
    }
  };
}
