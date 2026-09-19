import { useCallback, useState } from "react";

import { TOAST, shareText } from "@/copy";
import { track } from "@/lib/analytics";
import { buildCard, shareCard } from "@/lib/share";
import { HUMAN, OPPONENT } from "@/players";
import type { GameState } from "@/state/gameReducer";
import { outcomeOf, winLineOf } from "@/state/selectors";

export function useShare(state: GameState, showToast: (message: string) => void) {
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async () => {
    const outcome = outcomeOf(state.board);
    if (!outcome || sharing) return;

    track("share_click");
    setSharing(true);
    try {
      const url = `${location.origin}/`;
      const winnerMark = outcome === "loss" ? OPPONENT : HUMAN;
      const moves = state.board.filter((cell) => cell === winnerMark).length;

      const image = await buildCard({
        board: state.board,
        outcome,
        winLine: winLineOf(state.board),
        round: state.round,
        series: state.series,
        opponent: state.opponent,
      });
      const result = await shareCard(
        image,
        shareText(outcome, moves, state.series, state.opponent),
        url,
      );

      if (result === "downloaded") showToast(TOAST.saved);
      if (result === "shared") showToast(TOAST.shared);
    } catch {
      showToast(TOAST.shareFailed);
    } finally {
      setSharing(false);
    }
  }, [state, sharing, showToast]);

  return { share, sharing };
}
