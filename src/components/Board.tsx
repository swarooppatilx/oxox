import { CENTER, type Board as BoardState, type Line } from "@shared/game";
import { GRID_PATHS, winLinePath } from "@shared/markGeometry";
import type { Outcome } from "@shared/series";

import { Cell } from "@/components/Cell";
import { Confetti } from "@/components/Confetti";
import { Stamp } from "@/components/Stamp";
import { useGridNavigation } from "@/hooks/useGridNavigation";

interface BoardProps {
  board: BoardState;
  round: number;
  lastMove: number | null;
  winLine: Line | null;
  canPlay: boolean;
  thinking: boolean;
  showHint: boolean;
  reducedMotion: boolean;
  stamp: { text: string; tone: Outcome } | null;
  confetti: boolean;
  shake: boolean;
  youMark?: "X" | "O";
  onPlay: (index: number) => void;
}

const MARKS_PER_ROUND = 9;

export function Board(props: BoardProps) {
  const navigation = useGridNavigation();

  return (
    <div className="board-wrap">
      <div
        className={`board ${props.thinking ? "is-thinking" : ""} ${props.shake ? "shake" : ""}`}
        role="group"
        aria-label="Tic tac toe board. Use arrow keys to move, Enter to draw."
      >
        <svg viewBox="0 0 300 300" className="grid-svg" aria-hidden="true">
          {GRID_PATHS.map((path, i) => (
            <path
              key={path}
              d={path}
              pathLength={1}
              className="grid-line"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
          {props.winLine && (
            <path d={winLinePath(props.winLine)} pathLength={1} className="win-line" />
          )}
        </svg>

        {props.board.map((mark, index) => {
          const isLastMove = props.lastMove === index;
          return (
            <Cell
              key={index}
              index={index}
              mark={mark}
              seed={index + props.round * MARKS_PER_ROUND}
              isLastMove={isLastMove}
              drawing={isLastMove && !props.reducedMotion}
              pulse={props.showHint && index === CENTER}
              ghost={props.youMark ?? "X"}
              disabled={!props.canPlay || mark !== null}
              focusable={navigation.focusIndex === index}
              register={navigation.registerCell(index)}
              onPlay={() => props.onPlay(index)}
              onFocus={() => navigation.setFocusIndex(index)}
              onKeyDown={(event) => navigation.onKeyDown(event, index)}
            />
          );
        })}

        {props.stamp && <Stamp text={props.stamp.text} tone={props.stamp.tone} />}
      </div>
      {props.confetti && <Confetti />}
    </div>
  );
}
