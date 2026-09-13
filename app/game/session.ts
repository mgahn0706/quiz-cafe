export type GameState = {
  readonly solvedPuzzleIds: readonly number[];
};

export type AttemptResult = {
  readonly correct: boolean;
  readonly alreadySolved: boolean;
  readonly error?: "not-connected" | "timeout" | "transport-error" | "host-error";
  readonly message?: string;
};

export type ConnectionStatus = "local" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export type SubmitAttempt = (
  puzzleId: number,
  submittedValues: readonly string[],
) => Promise<AttemptResult>;

export interface GameSession {
  readonly state: GameState;
  readonly puzzleIds: readonly number[];
  readonly solvedCount: number;
  readonly totalPuzzleCount: number;
  readonly ready: boolean;
  readonly connectionStatus: ConnectionStatus;
  readonly connectionMessage?: string;
  readonly joinUrl?: string;
  readonly connectedParticipantCount?: number;
  isSolved(puzzleId: number): boolean;
  submitAttempt: SubmitAttempt;
}
