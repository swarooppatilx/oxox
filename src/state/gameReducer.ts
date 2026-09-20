import { emptyBoard, other, play, type Board, type Mark } from "#shared/game";
import type { MoveReply, Opponent } from "#shared/moves";
import { emptySeries, isSeriesOver, recordGame, type Series } from "#shared/series";

import { announceMove, announceOutcome, announceRound } from "@/copy";
import type { SavedGame } from "@/lib/storage";
import { HUMAN, humanOpens, OPPONENT } from "@/players";
import { outcomeOf } from "@/state/selectors";

export interface GameState {
  board: Board;
  turn: Mark;

  round: number;
  series: Series;
  opponent: Opponent;
  lastMove: number | null;

  lastReply: Pick<MoveReply, "mood" | "reason" | "threat"> | null;

  noteSeed: number;
  switchedOpponent: boolean;
  seenHint: boolean;
  announcement: string;
}

export type GameAction =
  | { type: "humanMoved"; index: number }
  | { type: "opponentMoved"; reply: MoveReply; noteSeed: number; round: number }
  | { type: "roundStarted" };

function turnFor(board: Board, round: number): Mark {
  const x = board.filter((cell) => cell === "X").length;
  const o = board.filter((cell) => cell === "O").length;
  const opener = humanOpens(round) ? HUMAN : OPPONENT;
  if (x === o) return opener;
  return x > o ? OPPONENT : HUMAN;
}

export function createInitialState(saved: SavedGame): GameState {
  const board = saved.board ?? emptyBoard();

  return {
    board,
    turn: turnFor(board, saved.round),
    round: saved.round,
    series: saved.series,
    opponent: "jev",
    lastMove: null,
    lastReply: null,
    noteSeed: 0,
    switchedOpponent: false,
    seenHint: saved.seenHint,
    announcement: "",
  };
}

function place(state: GameState, index: number, mark: Mark): GameState {
  const board = play(state.board, index, mark);
  const outcome = outcomeOf(board);
  const series = outcome ? recordGame(state.series, outcome) : state.series;

  return {
    ...state,
    board,
    series,
    lastMove: index,
    turn: other(mark),
    announcement: outcome
      ? announceOutcome(outcome, series, state.opponent)
      : announceMove(mark, index, state.opponent),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "humanMoved": {
      const legal =
        state.turn === HUMAN && state.board[action.index] === null && !outcomeOf(state.board);
      if (!legal) return state;
      return { ...place(state, action.index, HUMAN), seenHint: true, switchedOpponent: false };
    }

    case "opponentMoved": {
      const { reply, noteSeed } = action;
      const current =
        action.round === state.round &&
        state.turn === OPPONENT &&
        state.board[reply.index] === null &&
        !outcomeOf(state.board);
      if (!current) return state;
      return {
        ...place({ ...state, opponent: reply.source }, reply.index, OPPONENT),
        switchedOpponent: state.opponent === "jev" && reply.source === "minimax",
        lastReply: { mood: reply.mood, reason: reply.reason, threat: reply.threat },
        noteSeed,
      };
    }

    case "roundStarted": {
      const round = state.round + 1;
      const forfeited = !outcomeOf(state.board) && state.board.includes(HUMAN);
      const series = forfeited ? recordGame(state.series, "loss") : state.series;
      return {
        ...state,
        round,
        board: emptyBoard(),
        turn: humanOpens(round) ? HUMAN : OPPONENT,
        series: isSeriesOver(series) ? emptySeries : series,
        lastMove: null,
        lastReply: null,
        switchedOpponent: false,
        announcement: announceRound(humanOpens(round), state.opponent),
      };
    }
  }
}
