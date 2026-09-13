export type GameState = {
  readonly solvedPuzzleIds: readonly number[];
};

export type AttemptResult = {
  readonly correct: boolean;
  readonly alreadySolved: boolean;
};

export type SubmitAttempt = (
  puzzleId: number,
  submittedValues: readonly string[],
) => Promise<AttemptResult>;

export interface GameSession {
  readonly state: GameState;
  readonly solvedCount: number;
  readonly totalPuzzleCount: number;
  isSolved(puzzleId: number): boolean;
  submitAttempt: SubmitAttempt;
}
