import { useCallback, useEffect, useReducer } from "react";

import { useOpponentTurn } from "@/hooks/useOpponentTurn";
import { loadGame, saveGame } from "@/lib/storage";
import { createInitialState, gameReducer } from "@/state/gameReducer";
import { outcomeOf } from "@/state/selectors";

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(loadGame()),
  );

  useOpponentTurn(state, dispatch);

  useEffect(() => {
    const finished = outcomeOf(state.board) !== null;
    saveGame({
      series: state.series,
      seenHint: state.seenHint,
      round: finished ? state.round + 1 : state.round,
      board: finished ? null : state.board,
    });
  }, [state.series, state.seenHint, state.board, state.round]);

  const playCell = useCallback((index: number) => dispatch({ type: "humanMoved", index }), []);
  const startRound = useCallback(() => dispatch({ type: "roundStarted" }), []);

  return { state, playCell, startRound };
}
