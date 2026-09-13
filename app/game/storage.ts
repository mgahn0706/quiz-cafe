import { getPuzzleById } from "./puzzles";
import { isMemberIdentity } from "./member";
import type { SolveAttribution } from "./session";

export const solvedPuzzleStorageKey = "quiz-cafe-unlocked-cabinets";
const hostRevisionStorageKey = "quiz-cafe-host-revision";
const solveAttributionsStorageKey = "quiz-cafe-solve-attributions";

export function loadSolvedPuzzleIds() {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(solvedPuzzleStorageKey) ?? "[]");
    if (!Array.isArray(stored)) return [];

    return [...new Set(stored.filter((value): value is number => (
      Number.isInteger(value) && getPuzzleById(value) !== undefined
    )))].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function saveSolvedPuzzleIds(puzzleIds: readonly number[]) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(solvedPuzzleStorageKey, JSON.stringify(puzzleIds));
    return true;
  } catch {
    return false;
  }
}

export function subscribeToSolvedPuzzleIds(listener: (puzzleIds: number[]) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === solvedPuzzleStorageKey) listener(loadSolvedPuzzleIds());
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function loadHostRevision(fallback = 0) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = Number(window.localStorage.getItem(hostRevisionStorageKey));
    return Number.isInteger(stored) && stored >= fallback ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function saveHostRevision(revision: number) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(hostRevisionStorageKey, String(revision));
    return true;
  } catch {
    return false;
  }
}

export function loadSolveAttributions(solvedPuzzleIds: readonly number[]) {
  if (typeof window === "undefined") return [];
  const solvedIds = new Set(solvedPuzzleIds);

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(solveAttributionsStorageKey) ?? "[]");
    if (!Array.isArray(stored)) return [];

    const seen = new Set<number>();
    return stored.filter((value): value is SolveAttribution => {
      if (typeof value !== "object" || value === null) return false;
      const candidate = value as Record<string, unknown>;
      if (!Number.isInteger(candidate.puzzleId) || !solvedIds.has(candidate.puzzleId as number)) return false;
      if (seen.has(candidate.puzzleId as number) || !isMemberIdentity(candidate.member)) return false;
      seen.add(candidate.puzzleId as number);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveSolveAttributions(attributions: readonly SolveAttribution[]) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(solveAttributionsStorageKey, JSON.stringify(attributions));
    return true;
  } catch {
    return false;
  }
}
