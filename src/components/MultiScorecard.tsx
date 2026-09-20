import { SERIES_LENGTH } from "@shared/config";
import type { Mark } from "@shared/game";
import { gamesPlayed, type Series } from "@shared/series";

interface MultiScorecardProps {
  series: Series;
  gameNumber: number;
  youName: string;
  youMark: Mark;
  youScore: number;
  themName: string;
  themMark: Mark;
  themScore: number;
  draws: number;
}

export function MultiScorecard({
  series,
  gameNumber,
  youName,
  youMark,
  youScore,
  themName,
  themMark,
  themScore,
  draws,
}: MultiScorecardProps) {
  return (
    <div
      className="scorecard multi"
      role="group"
      aria-label={`Game ${gameNumber} of ${SERIES_LENGTH}. ${youName} ${youScore}, draws ${draws}, ${themName} ${themScore}. Games played ${gamesPlayed(series)}`}
    >
      <span className="game-number" aria-hidden="true">
        Game {gameNumber}
        <span className="of"> of </span>
        {SERIES_LENGTH}
      </span>
      <div>
        <span className="who">
          <b>{youName}</b> {youMark}
        </span>
        <strong className="score">{youScore}</strong>
      </div>
      <div>
        <span>Draws</span>
        <strong className="score">{draws}</strong>
      </div>
      <div>
        <span className="who">
          <b>{themName}</b> {themMark}
        </span>
        <strong className="score">{themScore}</strong>
      </div>
    </div>
  );
}
