import { SERIES_LENGTH } from "@shared/config";
import { isDraw, isOver, winnerOf, type Board, type Line } from "@shared/game";
import { gamesPlayed, isSeriesOver, seriesResult, type Outcome } from "@shared/series";

import {
  FIRST_NOTE,
  HINT_NOTE,
  MATCH_STAMP,
  MINIMAX_NOTES,
  MOOD_NOTES,
  REASON_NOTES,
  SWITCHED_NOTE,
  THINKING_NOTE,
  gameNote,
  gameStamp,
  gameStatus,
  matchNote,
  matchStatus,
  pickLine,
  roundNote,
} from "@/copy";
import { HUMAN, OPPONENT } from "@/players";
import type { GameState } from "@/state/gameReducer";

export function outcomeOf(board: Board): Outcome | null {
  const winner = winnerOf(board);
  if (winner) return winner.mark === HUMAN ? "win" : "loss";
  return isDraw(board) ? "draw" : null;
}

export const winLineOf = (board: Board): Line | null => winnerOf(board)?.line ?? null;

export const isOpponentTurn = (state: GameState) => state.turn === OPPONENT && !isOver(state.board);

export const hasHumanMoved = (state: GameState) => state.board.includes(HUMAN);

const hasStarted = (state: GameState) => state.board.some((cell) => cell !== null);

export function gameNumber(state: GameState): number {
  const played = gamesPlayed(state.series);
  return Math.min(SERIES_LENGTH, isOver(state.board) ? played : played + 1);
}

export function statusText(state: GameState): string {
  if (isSeriesOver(state.series) && isOver(state.board)) {
    return matchStatus(state.series, state.opponent);
  }
  return gameStatus(outcomeOf(state.board), !isOpponentTurn(state), state.opponent);
}

export function stampOf(state: GameState): { text: string; tone: Outcome } | null {
  const outcome = outcomeOf(state.board);
  if (!outcome) return null;
  if (!isSeriesOver(state.series)) {
    return { text: gameStamp(outcome, state.opponent), tone: outcome };
  }

  const result = seriesResult(state.series);
  return { text: MATCH_STAMP[result], tone: result === "tie" ? "draw" : result };
}

export const showsHint = (state: GameState) =>
  !state.seenHint && !hasStarted(state) && state.turn === HUMAN;

export function noteOf(state: GameState): string {
  const outcome = outcomeOf(state.board);
  if (outcome) {
    return isSeriesOver(state.series) ? matchNote(seriesResult(state.series)) : gameNote(outcome);
  }
  if (showsHint(state)) return HINT_NOTE;
  if (state.switchedOpponent) return SWITCHED_NOTE;
  if (!state.lastReply) {
    if (isOpponentTurn(state)) return THINKING_NOTE;
    return state.round === 0 ? FIRST_NOTE : roundNote(state.turn === HUMAN);
  }

  const roll = state.noteSeed % 10;
  const variant = Math.floor(state.noteSeed / 10);
  const { reason, mood } = state.lastReply;
  if (state.opponent === "minimax") return pickLine(MINIMAX_NOTES[reason], variant);
  return roll < 7 ? pickLine(REASON_NOTES[reason], variant) : pickLine(MOOD_NOTES[mood], variant);
}
