import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { CELL_NAMES, legalMoves, other, type Board, type Mark } from "@shared/game";
import type { Mood, MoveResult } from "@shared/moves";
import { reasonFor } from "@shared/reason";

const MOODS: Record<Mood, string> = {
  confident: "The opponent has the upper hand or a clear plan",
  nervous: "The opponent is under pressure and could lose soon",
  smug: "The opponent just set up a strong position, e.g. a fork",
  gracious: "The game is nearly even and heading toward a draw",
};

export function createAskJev(apiKey: string) {
  const client = new TypeSafeClient({ apiKey });

  return async function askJev(board: Board, ai: Mark, signal: AbortSignal): Promise<MoveResult> {
    const emptyCells = Object.fromEntries(
      legalMoves(board).map((i) => [CELL_NAMES[i] ?? "", null]),
    );

    const { answers } = await client.systemOne(
      {
        state: {
          game: "tic-tac-toe",
          board: Object.fromEntries(board.map((cell, i) => [CELL_NAMES[i], cell ?? "empty"])),
          you: ai,
          opponent: other(ai),
        },
        questions: {
          move: choice("What is the best next move for `you`?", emptyCells),
          mood: choice("How does `you` feel about this position?", MOODS),
        },
      },
      { signal, retry: { maxRetries: 0 } },
    );

    const index = CELL_NAMES.findIndex((name) => name === answers.move.choice);
    return { index, mood: answers.mood.choice, reason: reasonFor(board, ai, index) };
  };
}

const CHAT_VERDICTS = {
  fine: "Friendly, neutral or playful banter that any age could read",
  unsafe:
    "Hateful, harassing, threatening, sexual or explicit, a slur, personal information, or a scam link",
};

export function createJudgeChat(apiKey: string) {
  const client = new TypeSafeClient({ apiKey });

  return async function judgeChat(message: string, signal: AbortSignal): Promise<boolean> {
    const { answers } = await client.systemOne(
      {
        state: {
          context: "Live chat between two players of a friendly tic-tac-toe game",
          message,
        },
        questions: {
          verdict: choice("Is `message` fine to show to the other player?", CHAT_VERDICTS),
        },
      },
      { signal, retry: { maxRetries: 0 } },
    );
    return answers.verdict.choice === "fine";
  };
}
