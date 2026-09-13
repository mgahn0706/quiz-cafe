import { getPuzzleById } from "./puzzles";

export const solvedPuzzleStorageKey = "quiz-cafe-unlocked-cabinets";

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
