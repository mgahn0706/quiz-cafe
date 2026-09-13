import type { Puzzle } from "./puzzles";

export function validateAttempt(puzzle: Puzzle, submittedValues: readonly string[]) {
  return submittedValues.length === puzzle.answer.length
    && submittedValues.every((value, index) => value === puzzle.answer[index]);
}
