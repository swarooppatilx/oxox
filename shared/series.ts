import { SERIES_LENGTH } from "#shared/config";

export type Outcome = "win" | "loss" | "draw";
export type SeriesResult = "win" | "loss" | "tie";

export interface Series {
  you: number;
  opponent: number;
  draws: number;
}

export const emptySeries: Series = { you: 0, opponent: 0, draws: 0 };

export const gamesPlayed = (series: Series) => series.you + series.opponent + series.draws;
export const isSeriesOver = (series: Series) => gamesPlayed(series) >= SERIES_LENGTH;

export function recordGame(series: Series, outcome: Outcome): Series {
  if (outcome === "win") return { ...series, you: series.you + 1 };
  if (outcome === "loss") return { ...series, opponent: series.opponent + 1 };
  return { ...series, draws: series.draws + 1 };
}

export function seriesResult(series: Series): SeriesResult {
  if (series.you > series.opponent) return "win";
  if (series.you < series.opponent) return "loss";
  return "tie";
}
