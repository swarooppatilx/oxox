import type { Board, Mark } from "../shared/game.js";
import { bestMoves, minimaxMove } from "../shared/minimax.js";
import { toReply, type MoveReply } from "../shared/moves.js";
import { reasonFor } from "../shared/reason.js";
import { createAskJev } from "./jev.js";

const JEV_TIMEOUT_MS = 2500;
const JEV_COOLDOWN_MS = 15_000;

const pick = <T,>(items: readonly T[]): T | undefined =>
  items.length > 0 ? items[Math.floor(Math.random() * items.length)] : undefined;

export function createSolver(apiKey: string | undefined) {
  const askJev = apiKey ? createAskJev(apiKey) : undefined;
  let jevUnavailableUntil = 0;

  return async function solve(board: Board, ai: Mark): Promise<MoveReply> {
    const fromMinimax = () => toReply(board, ai, minimaxMove(board, ai), "minimax");

    if (!askJev || Date.now() < jevUnavailableUntil) return fromMinimax();

    try {
      const answer = await askJev(board, ai, AbortSignal.timeout(JEV_TIMEOUT_MS));
      if (board[answer.index] !== null) throw new Error("Jev chose an unavailable cell");

      const best = bestMoves(board, ai);
      const index = best.includes(answer.index) ? answer.index : (pick(best) ?? answer.index);

      return toReply(
        board,
        ai,
        { index, mood: answer.mood, reason: reasonFor(board, ai, index) },
        "jev",
      );
    } catch (error) {
      jevUnavailableUntil = Date.now() + JEV_COOLDOWN_MS;
      console.error("[jev] unavailable, using minimax:", error);
      return fromMinimax();
    }
  };
}
