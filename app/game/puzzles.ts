export type LockType =
  | "five-letter"
  | "five-letter-red"
  | "five-letter-blue"
  | "direction-red"
  | "direction-black"
  | "direction-light-blue"
  | "eight-pin"
  | "ten-pin"
  | "four-number-dials"
  | "five-number-dials"
  | "vertical-word";

export type Puzzle = {
  readonly id: number;
  readonly lockType: LockType;
  readonly answer: readonly string[];
  readonly clue: string;
};

export type LockInputDefinition = {
  readonly choices: readonly string[];
  readonly mode: "wheels" | "pins";
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numbers = "0123456789".split("");
const directions = ["↑", "→", "↓", "←"];

const lockInputDefinitions: Record<LockType, LockInputDefinition> = {
  "five-letter": { choices: alphabet, mode: "wheels" },
  "five-letter-red": { choices: alphabet, mode: "wheels" },
  "five-letter-blue": { choices: alphabet, mode: "wheels" },
  "vertical-word": { choices: alphabet, mode: "wheels" },
  "four-number-dials": { choices: numbers, mode: "wheels" },
  "five-number-dials": { choices: numbers, mode: "wheels" },
  "eight-pin": { choices: ["0", "1"], mode: "pins" },
  "ten-pin": { choices: ["0", "1"], mode: "pins" },
  "direction-red": { choices: directions, mode: "wheels" },
  "direction-black": { choices: directions, mode: "wheels" },
  "direction-light-blue": { choices: directions, mode: "wheels" },
};

const puzzlePattern: ReadonlyArray<Omit<Puzzle, "id">> = [
  { lockType: "five-letter-red", answer: ["C", "A", "F", "E", "S"], clue: "CAFES" },
  { lockType: "direction-red", answer: ["↑", "→", "↓", "←"], clue: "↑ → ↓ ←" },
  { lockType: "eight-pin", answer: ["1", "0", "1", "1", "0", "1", "0", "0"], clue: "● ○ ● ●  ○ ● ○ ○" },
  { lockType: "four-number-dials", answer: ["0", "0", "0", "0"], clue: "0000" },
  { lockType: "direction-black", answer: ["↑", "→", "↓", "←"], clue: "↑ → ↓ ←" },
  { lockType: "five-number-dials", answer: ["6", "6", "5", "6", "6"], clue: "66566" },
  { lockType: "vertical-word", answer: ["C", "A", "F", "E"], clue: "CAFE" },
  { lockType: "direction-light-blue", answer: ["↑", "→", "↓", "←"], clue: "↑ → ↓ ←" },
  { lockType: "five-letter-blue", answer: ["C", "A", "F", "E", "S"], clue: "CAFES" },
  { lockType: "ten-pin", answer: ["1", "0", "1", "1", "0", "1", "0", "0", "1", "0"], clue: "● ○ ● ● ○  ● ○ ○ ● ○" },
];

export const puzzles: readonly Puzzle[] = Array.from({ length: 100 }, (_, index) => {
  const template = puzzlePattern[index % puzzlePattern.length];
  return {
    id: index + 1,
    lockType: template.lockType,
    answer: [...template.answer],
    clue: template.clue,
  };
});

const puzzlesById = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));

export const totalPuzzleCount = puzzles.length;

export function getPuzzleById(puzzleId: number) {
  return puzzlesById.get(puzzleId);
}

export function getLockInputDefinition(lockType: LockType) {
  return lockInputDefinitions[lockType];
}

export function isDirectionLock(lockType: LockType) {
  return lockType.startsWith("direction-");
}

export function createInitialPuzzleValues(puzzle: Puzzle, solved: boolean) {
  if (solved) return [...puzzle.answer];
  if (isDirectionLock(puzzle.lockType)) return [];

  const { choices } = getLockInputDefinition(puzzle.lockType);
  return puzzle.answer.map((value, index) => {
    const answerIndex = choices.indexOf(value);
    return choices[(answerIndex + index + 1) % choices.length];
  });
}
