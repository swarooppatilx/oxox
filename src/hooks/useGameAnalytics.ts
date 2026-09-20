import { useEffect, useEffectEvent } from "react";

import { isSeriesOver, seriesResult, type Outcome } from "@shared/series";

import { track } from "@/lib/analytics";
import type { GameState } from "@/state/gameReducer";
import { outcomeOf } from "@/state/selectors";

export function useGameAnalytics(state: GameState): void {
  const outcome = outcomeOf(state.board);
  const matchOver = outcome !== null && isSeriesOver(state.series);

  const reportGame = useEffectEvent((result: Outcome) =>
    track("game_end", { result, opponent: state.opponent }),
  );
  const reportMatch = useEffectEvent(() =>
    track("match_end", { result: seriesResult(state.series) }),
  );

  useEffect(() => {
    if (outcome) reportGame(outcome);
  }, [outcome, state.round]);

  useEffect(() => {
    if (matchOver) reportMatch();
  }, [matchOver, state.round]);

  useEffect(() => {
    if (state.opponent === "minimax") track("opponent_fallback");
  }, [state.opponent]);
}
