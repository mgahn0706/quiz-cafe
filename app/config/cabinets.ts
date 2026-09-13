import { puzzles } from "../game/puzzles";
import type { LockType } from "../game/puzzles";

export const roomNames = [
  "Window wall",
  "Slow bar",
  "Reading nook",
  "Garden room",
  "Roastery",
  "Sun room",
  "Quiet corner",
  "Last table",
] as const;

export const sectionCounts = [12, 13, 11, 14, 10, 15, 13, 12] as const;

// Visual source for each illustrated lock. These files are design references;
// the interface renders reusable SVG components rather than the raster images.
export const lockReferences: Record<LockType, string> = {
  "five-letter": "/reference/word-lock-5.png",
  "five-letter-red": "/reference/word-lock-5.png",
  "five-letter-blue": "/reference/word-lock-5.png",
  "direction-red": "/reference/direction-lock-red.png",
  "direction-black": "/reference/direction-lock-red.png",
  "direction-light-blue": "/reference/direction-lock-red.png",
  "eight-pin": "/reference/ten-pin-lock.png",
  "ten-pin": "/reference/ten-pin-lock.png",
  "four-number-dials": "/reference/num-dial-lock-horizontal.png",
  "five-number-dials": "/reference/num-vertical-lock.png",
  "vertical-word": "/reference/word-vertical-lock.png",
};

export const puzzleSections = sectionCounts.map((count, index) => {
  const start = sectionCounts
    .slice(0, index)
    .reduce((sum, size) => sum + size, 0);
  return puzzles.slice(start, start + count);
});

export const backgroundOffsets = [-18, -12, -6, 0, 6, 12, 18, 0] as const;
