import { CENTER, CORNERS, other, play, winningCells, type Board, type Mark } from "#shared/game";
import type { Reason } from "#shared/moves";

export function reasonFor(board: Board, player: Mark, index: number): Reason {
  if (winningCells(board, player).includes(index)) return "win";
  if (winningCells(board, other(player)).includes(index)) return "block";

  const threats = winningCells(play(board, index, player), player).length;
  if (threats >= 2) return "fork";
  if (threats === 1) return "setup";
  if (index === CENTER) return "center";
  return CORNERS.includes(index) ? "corner" : "edge";
}
