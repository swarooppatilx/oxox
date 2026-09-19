import { SLIP_RATE } from "./config.js";
import {
  isDraw,
  legalMoves,
  other,
  play,
  winnerOf,
  winningCells,
  type Board,
  type Mark,
} from "./game.js";
import type { Mood, MoveResult } from "./moves.js";
import { reasonFor } from "./reason.js";

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

interface MinimaxOptions {
  slipRate?: number;
  rng?: () => number;
}

export function minimaxMove(
  board: Board,
  ai: Mark,
  { slipRate = SLIP_RATE, rng = Math.random }: MinimaxOptions = {},
): MoveResult {
  const legal = legalMoves(board);
  if (legal.length === 0) throw new Error("No legal moves");

  const scored = legal.map((index) => ({
    index,
    score: minimax(play(board, index, ai), other(ai), ai),
  }));
  const bestScore = Math.max(...scored.map((move) => move.score));
  const best = scored.filter((move) => move.score === bestScore).map((move) => move.index);

  const canWinNow = winningCells(board, ai).length > 0;
  const slips = !canWinNow && rng() < slipRate;
  const pool = slips ? legal : best;
  const index = pool[Math.floor(rng() * pool.length)] ?? legal[0] ?? 0;

  return { index, mood: moodFor(bestScore), reason: reasonFor(board, ai, index) };
}
