export type Mark = "X" | "O";
export type Cell = Mark | null;
export type Board = readonly Cell[];
export type Line = readonly [number, number, number];

const LINES: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const CELL_NAMES = [
  "top-left",
  "top-middle",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-middle",
  "bottom-right",
] as const;

export const CENTER = 4;
export const CORNERS: readonly number[] = [0, 2, 6, 8];

export const emptyBoard = (): Board => Array<Cell>(9).fill(null);

export const other = (mark: Mark): Mark => (mark === "X" ? "O" : "X");

export const legalMoves = (board: Board): number[] =>
  board.flatMap((cell, index) => (cell === null ? [index] : []));

export function winnerOf(board: Board): { mark: Mark; line: Line } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) return { mark, line };
  }
  return null;
}

export const isDraw = (board: Board): boolean =>
  winnerOf(board) === null && board.every((cell) => cell !== null);

export const isOver = (board: Board): boolean => winnerOf(board) !== null || isDraw(board);

export function play(board: Board, index: number, mark: Mark): Board {
  if (!Number.isInteger(index) || index < 0 || index > 8 || board[index] !== null) {
    throw new Error(`Illegal move: ${index}`);
  }
  return board.map((cell, i) => (i === index ? mark : cell));
}

export function winningCells(board: Board, mark: Mark): number[] {
  return legalMoves(board).filter((index) => winnerOf(play(board, index, mark))?.mark === mark);
}

const hasLine = (board: Board, mark: Mark) =>
  LINES.some((line) => line.every((index) => board[index] === mark));

export function isPlausible(board: Board, next: Mark): boolean {
  const x = board.filter((cell) => cell === "X").length;
  const o = board.filter((cell) => cell === "O").length;
  if (Math.abs(x - o) > 1) return false;

  const xWon = hasLine(board, "X");
  const oWon = hasLine(board, "O");
  if (xWon && oWon) return false;
  if (xWon && x < o) return false;
  if (oWon && o < x) return false;

  if (x > o) return next === "O";
  if (o > x) return next === "X";
  return true;
}
