import { useEffect, useEffectEvent, type Dispatch } from "react";

import { chooseOpponentMove } from "@/lib/opponent";
import type { GameAction, GameState } from "@/state/gameReducer";
import { isOpponentTurn } from "@/state/selectors";

const NOTE_SEEDS = 1000;

const randomSeed = () => Math.floor(Math.random() * NOTE_SEEDS);

export function useOpponentTurn(state: GameState, dispatch: Dispatch<GameAction>): void {
  const opponentToMove = isOpponentTurn(state);

  const fetchMove = useEffectEvent((signal: AbortSignal) =>
    chooseOpponentMove(state.board, signal),
  );

  useEffect(() => {
    if (!opponentToMove) return;
    const controller = new AbortController();
    const round = state.round;

    void fetchMove(controller.signal).then((reply) => {
      if (!reply || controller.signal.aborted) return;
      dispatch({ type: "opponentMoved", reply, noteSeed: randomSeed(), round });
    });

    return () => controller.abort();
  }, [opponentToMove, state.round, dispatch]);
}
