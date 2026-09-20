import { isDraw, legalMoves, other, play, winnerOf, type Board, type Mark } from "#shared/game";
import type { Mood, MoveResult } from "#shared/moves";
import { reasonFor } from "#shared/reason";

const scores = new Map<string, number>();

function minimax(board: Board, turn: Mark, ai: Mark): number {
  const ply = board.filter((cell) => cell !== null).length;
  const winner = winnerOf(board);
  if (winner) return winner.mark === ai ? 10 - ply : ply - 10;
  if (isDraw(board)) return 0;

  const key = `${ai}${turn}${board.map((cell) => cell ?? "-").join("")}`;
  const known = scores.get(key);
  if (known !== undefined) return known;

  const next = legalMoves(board).map((index) => minimax(play(board, index, turn), other(turn), ai));
  const value = turn === ai ? Math.max(...next) : Math.min(...next);
  scores.set(key, value);
  return value;
}

function moodFor(bestScore: number): Mood {
  if (bestScore >= 5) return "smug";
  if (bestScore > 0) return "confident";
  if (bestScore < 0) return "nervous";
  return "gracious";
}

export function bestMoves(board: Board, ai: Mark): readonly number[] {
  const legal = legalMoves(board);
  if (legal.length === 0) return [];

  const scored = legal.map((index) => ({
    index,
    score: minimax(play(board, index, ai), other(ai), ai),
  }));
  const bestScore = Math.max(...scored.map((move) => move.score));
  return scored.filter((move) => move.score === bestScore).map((move) => move.index);
}

interface MinimaxOptions {
  rng?: () => number;
}

function pick(rng: () => number, items: readonly number[]): number {
  if (items.length === 0) return 0;
  return items[Math.floor(rng() * items.length) % items.length] ?? 0;
}

export function minimaxMove(
  board: Board,
  ai: Mark,
  { rng = Math.random }: MinimaxOptions = {},
): MoveResult {
  const legal = legalMoves(board);
  if (legal.length === 0) throw new Error("No legal moves");

  const best = bestMoves(board, ai);
  const index = best.length > 0 ? pick(rng, best) : pick(rng, legal);
  const score = minimax(play(board, index, ai), other(ai), ai);

  return { index, mood: moodFor(score), reason: reasonFor(board, ai, index) };
}
