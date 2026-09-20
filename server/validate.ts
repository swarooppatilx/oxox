import { isOver, isPlausible, type Board, type Cell, type Mark } from "#shared/game";

interface MoveRequest {
  board: Board;
  ai: Mark;
}

const isCell = (value: unknown): value is Cell => value === null || value === "X" || value === "O";

export function parseMoveRequest(body: unknown): MoveRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { board, aiMark } = body as Record<string, unknown>;

  if (!Array.isArray(board) || board.length !== 9 || !board.every(isCell)) return null;
  if (aiMark !== "X" && aiMark !== "O") return null;
  if (!isPlausible(board, aiMark) || isOver(board)) return null;

  return { board, ai: aiMark };
}
