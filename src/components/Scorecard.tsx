import { SERIES_LENGTH } from "#shared/config";
import type { Opponent } from "#shared/moves";
import type { Series } from "#shared/series";

import { opponentLabel, opponentName } from "@/copy";

interface ScorecardProps {
  series: Series;
  opponent: Opponent;
  gameNumber: number;
}

export function Scorecard({ series, opponent, gameNumber }: ScorecardProps) {
  return (
    <div
      className="scorecard"
      role="group"
      aria-label={`Game ${gameNumber} of ${SERIES_LENGTH}. You ${series.you}, draws ${series.draws}, ${opponentName(opponent)} ${series.opponent}`}
    >
      <span className="game-number" aria-hidden="true">
        Game {gameNumber}
        <span className="of"> of </span>
        {SERIES_LENGTH}
      </span>
      <div>
        <span>You ✕</span>
        <strong className="score">{series.you}</strong>
      </div>
      <div>
        <span>Draws</span>
        <strong className="score">{series.draws}</strong>
      </div>
      <div>
        <span>{opponentLabel(opponent)} ○</span>
        <strong className="score">{series.opponent}</strong>
      </div>
    </div>
  );
}
