import { useState } from "react";

import { Actions } from "@/components/Actions";
import { Board } from "@/components/Board";
import { Credit } from "@/components/Credit";
import { PageHeader } from "@/components/PageHeader";
import { Scorecard } from "@/components/Scorecard";
import { StatusLine } from "@/components/StatusLine";
import { StickyNote } from "@/components/StickyNote";
import { useGame } from "@/hooks/useGame";
import { useGameAnalytics } from "@/hooks/useGameAnalytics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useShare } from "@/hooks/useShare";
import { useTearOut } from "@/hooks/useTearOut";
import { HUMAN } from "@/players";
import type { ModeToggleProps } from "@/components/ModeToggle";
import {
  gameNumber,
  isOpponentTurn,
  noteOf,
  outcomeOf,
  showsHint,
  stampOf,
  statusText,
  winLineOf,
} from "@/state/selectors";

const HOLES = 6;

export function SoloGame({
  hidden,
  showToast,
  modeSwitch,
}: {
  hidden: boolean;
  showToast: (message: string) => void;
  modeSwitch: ModeToggleProps;
}) {
  const { state, playCell, startRound } = useGame();
  const [firstRound] = useState(state.round);
  const reducedMotion = useReducedMotion();
  const tearOut = useTearOut(state, startRound);
  const { share, sharing } = useShare(state, showToast);
  useGameAnalytics(state);

  const outcome = outcomeOf(state.board);
  const thinking = isOpponentTurn(state);
  const humanToMove = state.turn === HUMAN && outcome === null;

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {state.announcement}
      </div>

      <section
        className={`page${state.round === firstRound ? "" : " flip"}`}
        key={state.round}
        hidden={hidden}
      >
        <div className="holes" aria-hidden="true">
          {Array.from({ length: HOLES }, (_, i) => (
            <span key={i} />
          ))}
        </div>

        <PageHeader modeSwitch={modeSwitch} />
        <div className="scoreline">
          <Scorecard
            series={state.series}
            opponent={state.opponent}
            gameNumber={gameNumber(state)}
          />
        </div>

        <Board
          board={state.board}
          round={state.round}
          lastMove={state.lastMove}
          winLine={winLineOf(state.board)}
          canPlay={humanToMove}
          thinking={thinking}
          showHint={showsHint(state)}
          reducedMotion={reducedMotion}
          stamp={stampOf(state)}
          confetti={outcome === "win"}
          shake={outcome === "loss"}
          onPlay={playCell}
        />

        <footer>
          <StatusLine text={statusText(state)} thinking={thinking} opponent={state.opponent} />
          <div className="slot">
            <StickyNote
              mood={state.lastReply?.mood ?? "gracious"}
              warning={humanToMove && state.lastReply?.threat === true}
              text={noteOf(state)}
            />
          </div>
          <Actions
            nextLabel={tearOut.label}
            onNext={tearOut.onClick}
            canShare={outcome !== null}
            sharing={sharing}
            onShare={share}
          />
          <Credit />
        </footer>
      </section>
    </>
  );
}
