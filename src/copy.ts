import { SERIES_LENGTH } from "#shared/config";
import { CELL_NAMES, type Cell, type Mark } from "#shared/game";
import type { Mood, Opponent, Reason } from "#shared/moves";
import {
  isSeriesOver,
  seriesResult,
  type Outcome,
  type Series,
  type SeriesResult,
} from "#shared/series";

const OPPONENT_NAMES: Record<Opponent, { full: string; short: string; label: string }> = {
  jev: { full: "Jev", short: "Jev", label: "Jev" },
  minimax: { full: "Minimax bot", short: "Minimax", label: "Bot" },
};

export const opponentName = (opponent: Opponent) => OPPONENT_NAMES[opponent].full;
const opponentShortName = (opponent: Opponent) => OPPONENT_NAMES[opponent].short;
export const opponentLabel = (opponent: Opponent) => OPPONENT_NAMES[opponent].label;

export const OPPONENT_CHIP: Record<Opponent, { label: string; description: string }> = {
  jev: {
    label: "vs Jev",
    description: "Jev, an AI model that judges the board, is your opponent.",
  },
  minimax: {
    label: "vs Minimax bot",
    description: "Jev is unavailable right now, so a classic minimax algorithm is playing.",
  },
};

export const HINT_NOTE = "Tap a square to draw your X.";
export const FIRST_NOTE = "Your move. You're the crosses.";
export const THINKING_NOTE = "Let me think…";
export const SWITCHED_NOTE = "Jev stepped out, so the minimax bot took over.";

export const MOOD_NOTES: Record<Mood, readonly string[]> = {
  confident: ["Right where I want you.", "Hmm, yes. Proceeding as planned.", "Nice try, though."],
  nervous: ["Oh dear. That's a bit close…", "Don't look at me like that.", "Was that a trap?"],
  smug: ["Two ways to win. Good luck.", "I do love a fork.", "Check the corners, friend."],
  gracious: ["Well played so far.", "A draw would be respectable.", "You're not bad, you know."],
};

export const REASON_NOTES: Record<Reason, readonly string[]> = {
  win: ["Three in a row. Ha!"],
  block: ["Not so fast. Blocked.", "I saw that coming.", "Nice try. That square's mine."],
  fork: ["Two ways to win. Good luck.", "I do love a fork.", "Checkmate-ish. Tic-tac-mate?"],
  setup: ["Now I'm threatening something.", "Your move. Watch that row.", "Setting a little trap."],
  center: ["The middle. Always the middle.", "Centre square, best square."],
  corner: ["Corners are underrated.", "Staking out a corner."],
  edge: ["A quiet little edge move.", "Hmm, subtle."],
};

export const MINIMAX_NOTES: Record<Reason, readonly string[]> = {
  win: ["Winning line found."],
  block: ["Your threat is blocked.", "Branch pruned: you can't win there."],
  fork: ["Two threats. Every branch wins.", "A fork. The search is over."],
  setup: ["Creating a threat.", "Searching deeper: this line looks good."],
  center: ["The centre scores highest.", "Evaluated 4,000 positions. Centre."],
  corner: ["Corner evaluated best.", "Best score: a corner."],
  edge: ["The edge is the safest branch.", "Every other branch scored lower."],
};

const GAME_NOTES: Record<Outcome, string> = {
  win: "You got me! Rematch?",
  loss: "Three in a row. Better luck next page.",
  draw: "A draw. The page fills up with nothing.",
};

const MATCH_NOTES: Record<SeriesResult, string> = {
  win: "The match is yours. Well played!",
  loss: "The match is mine. Another?",
  tie: "All square. Another match?",
};

export const gameNote = (outcome: Outcome) => GAME_NOTES[outcome];
export const matchNote = (result: SeriesResult) => MATCH_NOTES[result];

export const roundNote = (playerOpens: boolean) =>
  playerOpens ? "Your move." : "I'll start this one.";

export function pickLine(lines: readonly string[], seed: number): string {
  return lines[seed % lines.length] ?? "";
}

export function gameStamp(outcome: Outcome, opponent: Opponent): string {
  if (outcome === "win") return "YOU WIN!";
  if (outcome === "loss") return `${opponentShortName(opponent).toUpperCase()} WINS`;
  return "DRAW";
}

export const MATCH_STAMP: Record<SeriesResult, string> = {
  win: "MATCH WON!",
  loss: "MATCH LOST",
  tie: "MATCH TIED",
};

export function matchStatus(series: Series, opponent: Opponent): string {
  const result = seriesResult(series);
  if (result === "win") return `You won the match ${series.you}–${series.opponent}!`;
  if (result === "loss") {
    return `${opponentName(opponent)} won the match ${series.opponent}–${series.you}`;
  }
  return `Match tied ${series.you}–${series.opponent}`;
}

export function gameStatus(
  outcome: Outcome | null,
  humanTurn: boolean,
  opponent: Opponent,
): string {
  if (outcome === "win") return "You win!";
  if (outcome === "loss") return `${opponentName(opponent)} wins`;
  if (outcome === "draw") return "Draw";
  return humanTurn ? "Your turn" : `${opponentLabel(opponent)} is thinking`;
}

const MARK_NAMES: Record<Mark, string> = { X: "cross", O: "nought" };

export const announceMove = (mark: Mark, index: number, opponent: Opponent) =>
  mark === "X"
    ? `You drew a cross in the ${CELL_NAMES[index]}.`
    : `${opponentName(opponent)} drew a nought in the ${CELL_NAMES[index]}.`;

export function announceOutcome(outcome: Outcome, series: Series, opponent: Opponent): string {
  if (isSeriesOver(series)) return `Match over. ${matchNote(seriesResult(series))}`;
  if (outcome === "win") return "You win!";
  if (outcome === "loss") return `${opponentName(opponent)} wins.`;
  return "It's a draw.";
}

export const announceRound = (playerOpens: boolean, opponent: Opponent) =>
  playerOpens ? "New page. Your move." : `New page. ${opponentName(opponent)} starts.`;

export const cellLabel = (index: number, cell: Cell) =>
  `${CELL_NAMES[index]}: ${cell === null ? "empty" : MARK_NAMES[cell]}`;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function shareHeadline(outcome: Outcome, series: Series, opponent: Opponent): string {
  if (isSeriesOver(series)) {
    const result = seriesResult(series);
    if (result === "win") return "I won the match!";
    return result === "loss" ? `${opponentName(opponent)} won the match` : "A tied match!";
  }
  if (outcome === "win") return `I beat ${opponentName(opponent)}!`;
  return outcome === "loss" ? `${opponentShortName(opponent)} got me…` : "A draw!";
}

export function shareText(
  outcome: Outcome,
  moves: number,
  series: Series,
  opponent: Opponent,
): string {
  const name = opponentName(opponent);
  if (isSeriesOver(series)) {
    const match = `${SERIES_LENGTH}-game tic-tac-toe match`;
    const result = seriesResult(series);
    if (result === "win") {
      return `I beat ${name} ${series.you}-${series.opponent} in a ${match}. Think you can?`;
    }
    if (result === "loss") {
      return `${name} beat me ${series.opponent}-${series.you} in a ${match}. Can you do better?`;
    }
    return `I tied ${name} ${series.you}-${series.opponent} in a ${match}. Can you beat it?`;
  }
  const length = plural(moves, "move");
  if (outcome === "win") return `I beat ${name} at tic-tac-toe in ${length}. Think you can?`;
  if (outcome === "loss") return `${name} beat me at tic-tac-toe in ${length}. Can you do better?`;
  return `I held ${name} to a draw at tic-tac-toe. Can you beat it?`;
}

export const TOAST = {
  saved: "Saved to your downloads. Text copied!",
  shared: "Shared!",
  shareFailed: "Couldn't make the picture. Try again.",
} as const;

export const CREDIT = {
  author: "Swaroop",
  repoUrl: "https://github.com/swarooppatilx/oxox",
} as const;
