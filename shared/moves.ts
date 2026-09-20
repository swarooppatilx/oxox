import { play, winningCells, type Board, type Mark } from "@shared/game";

export type Mood = "confident" | "nervous" | "smug" | "gracious";

export type Reason = "win" | "block" | "fork" | "setup" | "center" | "corner" | "edge";

export type Opponent = "jev" | "minimax";

export interface MoveResult {
  index: number;
  mood: Mood;
  reason: Reason;
}

export interface MoveReply extends MoveResult {
  threat: boolean;
  source: Opponent;
}

export function toReply(board: Board, player: Mark, move: MoveResult, source: Opponent): MoveReply {
  const after = play(board, move.index, player);
  return { ...move, threat: winningCells(after, player).length > 0, source };
}
