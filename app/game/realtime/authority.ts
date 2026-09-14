import { getPuzzleById } from "../puzzles";
import type { GameState, AttemptResult, MemberIdentity } from "../session";
import { validateAttempt } from "../validation";

export type AuthoritativeState = {
  readonly gameState: GameState;
  readonly revision: number;
};

export type AuthoritativeAttempt = {
  readonly next: AuthoritativeState;
  readonly result: AttemptResult;
  readonly changed: boolean;
};

export function processAuthoritativeAttempt(
  current: AuthoritativeState,
  puzzleId: number,
  submittedValues: readonly string[],
  member?: MemberIdentity,
): AuthoritativeAttempt {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle || !validateAttempt(puzzle, submittedValues)) {
    return {
      next: current,
      result: { correct: false, alreadySolved: false },
      changed: false,
    };
  }

  if (current.gameState.solvedPuzzleIds.includes(puzzleId)) {
    return {
      next: current,
      result: { correct: true, alreadySolved: true },
      changed: false,
    };
  }

  return {
    next: {
      gameState: {
        solvedPuzzleIds: [...current.gameState.solvedPuzzleIds, puzzleId].sort((a, b) => a - b),
        solveAttributions: member
          ? [...current.gameState.solveAttributions, { puzzleId, member }]
          : current.gameState.solveAttributions,
        timerStartedAt: current.gameState.timerStartedAt,
        timerStoppedAt: current.gameState.timerStoppedAt,
      },
      revision: current.revision + 1,
    },
    result: { correct: true, alreadySolved: false },
    changed: true,
  };
}
