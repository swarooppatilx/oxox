import { Actions } from "@/components/Actions";
import { Board } from "@/components/Board";
import { Credit } from "@/components/Credit";
import { InkFilters } from "@/components/InkFilters";
import { Scorecard } from "@/components/Scorecard";
import { StatusLine } from "@/components/StatusLine";
import { StickyNote } from "@/components/StickyNote";
import { Toast } from "@/components/Toast";
import { useGame } from "@/hooks/useGame";
import { useGameAnalytics } from "@/hooks/useGameAnalytics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useShare } from "@/hooks/useShare";
import { useTearOut } from "@/hooks/useTearOut";
import { useToast } from "@/hooks/useToast";
import { HUMAN } from "@/players";
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

export function App() {
  const { state, playCell, startRound } = useGame();
  const reducedMotion = useReducedMotion();
  const toast = useToast();
  const tearOut = useTearOut(state, startRound);
  const { share, sharing } = useShare(state, toast.show);
  useGameAnalytics(state);

  const outcome = outcomeOf(state.board);
  const thinking = isOpponentTurn(state);
  const humanToMove = state.turn === HUMAN && outcome === null;

  return (
    <main className="desk">
      <InkFilters />
      <div className="sr-only" role="status" aria-live="polite">
        {state.announcement}
      </div>

      <div className="sheet">
        <section className="page" key={state.round}>
          <div className="holes" aria-hidden="true">
            {Array.from({ length: HOLES }, (_, i) => (
              <span key={i} />
            ))}
          </div>

          <header>
            <h1>
              Noughts <span>&amp;</span> Crosses
            </h1>
            <Scorecard
              series={state.series}
              opponent={state.opponent}
              gameNumber={gameNumber(state)}
            />
          </header>

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
            <StickyNote
              mood={state.lastReply?.mood ?? "gracious"}
              warning={humanToMove && state.lastReply?.threat === true}
              text={noteOf(state)}
            />
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
      </div>

      <Toast message={toast.message} />
    </main>
  );
}
