import { isMemberIdentity } from "../member";
import type { MemberIdentity, SolveAttribution } from "../session";

export const realtimeProtocolVersion = 2 as const;

export type ParticipantToHostMessage =
  | { type: "HELLO"; protocolVersion: typeof realtimeProtocolVersion; member: MemberIdentity }
  | { type: "SUBMIT_ATTEMPT"; requestId: string; puzzleId: number; answer: string[] }
  | { type: "REQUEST_SNAPSHOT" };

export type HostToParticipantMessage =
  | { type: "SNAPSHOT"; revision: number; solvedPuzzleIds: number[]; solveAttributions: SolveAttribution[]; puzzleIds: number[]; totalPuzzleCount: number }
  | { type: "ATTEMPT_RESULT"; requestId: string; puzzleId: number; correct: boolean; alreadySolved: boolean }
  | { type: "STATE_UPDATE"; revision: number; solvedPuzzleIds: number[]; solveAttributions: SolveAttribution[] }
  | { type: "HOST_ERROR"; code: string; message: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequestId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function isPuzzleId(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isRevision(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isPuzzleIdArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= 1000 && value.every(isPuzzleId);
}

function isAnswer(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= 64
    && value.every((part) => typeof part === "string" && part.length <= 16);
}

function isSolveAttributionArray(value: unknown): value is SolveAttribution[] {
  return Array.isArray(value)
    && value.length <= 1000
    && value.every((entry) => {
      if (!isRecord(entry)) return false;
      return isPuzzleId(entry.puzzleId) && isMemberIdentity(entry.member);
    });
}

export function isParticipantToHostMessage(value: unknown): value is ParticipantToHostMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "HELLO":
      return value.protocolVersion === realtimeProtocolVersion && isMemberIdentity(value.member);
    case "SUBMIT_ATTEMPT":
      return isRequestId(value.requestId) && isPuzzleId(value.puzzleId) && isAnswer(value.answer);
    case "REQUEST_SNAPSHOT":
      return true;
    default:
      return false;
  }
}

export function isHostToParticipantMessage(value: unknown): value is HostToParticipantMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "SNAPSHOT":
      return isRevision(value.revision)
        && isPuzzleIdArray(value.solvedPuzzleIds)
        && isSolveAttributionArray(value.solveAttributions)
        && isPuzzleIdArray(value.puzzleIds)
        && Number.isInteger(value.totalPuzzleCount)
        && Number(value.totalPuzzleCount) >= 0;
    case "ATTEMPT_RESULT":
      return isRequestId(value.requestId)
        && isPuzzleId(value.puzzleId)
        && typeof value.correct === "boolean"
        && typeof value.alreadySolved === "boolean";
    case "STATE_UPDATE":
      return isRevision(value.revision)
        && isPuzzleIdArray(value.solvedPuzzleIds)
        && isSolveAttributionArray(value.solveAttributions);
    case "HOST_ERROR":
      return typeof value.code === "string"
        && value.code.length > 0
        && value.code.length <= 64
        && typeof value.message === "string"
        && value.message.length <= 240;
    default:
      return false;
  }
}

export function shouldApplyRevision(currentRevision: number, incomingRevision: number) {
  return incomingRevision > currentRevision;
}
