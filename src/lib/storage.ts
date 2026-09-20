import { isOver, type Board, type Cell } from "#shared/game";
import { emptySeries, isSeriesOver, type Series } from "#shared/series";

import { humanOpens } from "@/players";

const KEY = "oxox";

export interface SavedGame {
  series: Series;
  seenHint: boolean;
  round: number;
  board: Board | null;
}

const defaultSavedGame = (): SavedGame => ({
  series: { ...emptySeries },
  seenHint: false,
  round: 0,
  board: null,
});

type Store = Pick<Storage, "getItem" | "setItem">;

function browserStore(): Store | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCell = (value: unknown): value is Cell => value === null || value === "X" || value === "O";

const toCount = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

function toBoard(value: unknown, round: number): Board | null {
  if (!Array.isArray(value) || value.length !== 9 || !value.every(isCell)) return null;

  const crosses = value.filter((cell) => cell === "X").length;
  const noughts = value.filter((cell) => cell === "O").length;
  const openerLead = humanOpens(round) ? crosses - noughts : noughts - crosses;
  const plausible = openerLead === 0 || openerLead === 1;

  return plausible && !isOver(value) ? value : null;
}

export function loadGame(store: Store | undefined = browserStore()): SavedGame {
  try {
    const raw = store?.getItem(KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (!isRecord(saved)) return defaultSavedGame();

    const scores = isRecord(saved.series) ? saved.series : {};
    const series: Series = {
      you: toCount(scores.you),
      opponent: toCount(scores.opponent),
      draws: toCount(scores.draws),
    };
    const round = toCount(saved.round);
    const matchOver = isSeriesOver(series);

    return {
      series: matchOver ? { ...emptySeries } : series,
      seenHint: saved.seenHint === true,
      round,
      board: matchOver ? null : toBoard(saved.board, round),
    };
  } catch {
    return defaultSavedGame();
  }
}

export function saveGame(saved: SavedGame, store: Store | undefined = browserStore()): void {
  try {
    store?.setItem(KEY, JSON.stringify(saved));
  } catch {}
}
