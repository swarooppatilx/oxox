import type { Board } from "@shared/game";
import { minimaxMove } from "@shared/minimax";
import { toReply, type MoveReply } from "@shared/moves";

import { requestMove } from "@/lib/api";
import { OPPONENT } from "@/players";

const FALLBACK_THINK_MS = 350;

function pause(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);

    const timer = setTimeout(() => resolve(true), ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      { once: true },
    );
  });
}

export async function chooseOpponentMove(
  board: Board,
  signal: AbortSignal,
): Promise<MoveReply | null> {
  const localMove = async (): Promise<MoveReply | null> => {
    if (!(await pause(FALLBACK_THINK_MS, signal))) return null;
    return toReply(board, OPPONENT, minimaxMove(board, OPPONENT), "minimax");
  };

  if (typeof navigator !== "undefined" && navigator.onLine === false) return localMove();

  try {
    return await requestMove(board, signal);
  } catch {
    return localMove();
  }
}
