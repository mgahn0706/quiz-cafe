export type MemberIdentity = {
  readonly id: string;
  readonly nickname: string;
};

export type SolveAttribution = {
  readonly puzzleId: number;
  readonly member: MemberIdentity;
};

export type GameState = {
  readonly solvedPuzzleIds: readonly number[];
  readonly solveAttributions: readonly SolveAttribution[];
  readonly timerStartedAt: number | null;
  readonly timerStoppedAt: number | null;
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
  readonly connectedMembers?: readonly MemberIdentity[];
  readonly currentMember?: MemberIdentity;
  startTimer?(): void;
  isSolved(puzzleId: number): boolean;
  submitAttempt: SubmitAttempt;
}
