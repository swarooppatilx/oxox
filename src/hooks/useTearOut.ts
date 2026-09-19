import { useEffect, useState } from "react";

import { isSeriesOver } from "@shared/series";

import type { GameState } from "@/state/gameReducer";
import { hasHumanMoved, outcomeOf } from "@/state/selectors";

const CONFIRM_MS = 3000;

export function useTearOut(state: GameState, startRound: () => void) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const finished = outcomeOf(state.board) !== null;
  const forfeits = !finished && hasHumanMoved(state);

  const onClick = () => {
    if (forfeits && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    startRound();
  };

  let label = "Tear out page";
  if (confirming) label = "Forfeit game?";
  if (finished) label = isSeriesOver(state.series) ? "New match" : "Next page";

  return { label, onClick };
}
