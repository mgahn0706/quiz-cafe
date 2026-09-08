export type LockType =
  | "five-letter"
  | "direction-red"
  | "direction-black"
  | "direction-light-blue"
  | "eight-pin"
  | "four-number-dials"
  | "five-number-dials"
  | "vertical-word";

export type CabinetData = {
  number: number;
  lock: LockType;
};

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

// Change this sequence to control how lock designs are assigned to cabinets.
export const lockPattern: LockType[] = [
  "five-letter",
  "direction-red",
  "eight-pin",
  "four-number-dials",
  "direction-black",
  "five-number-dials",
  "vertical-word",
  "direction-light-blue",
];

// Visual source for each illustrated lock. These files are design references;
// the interface renders reusable SVG components rather than the raster images.
export const lockReferences: Record<LockType, string> = {
  "five-letter": "/reference/word-lock-5.png",
  "direction-red": "/reference/direction-lock-red.png",
  "direction-black": "/reference/direction-lock-red.png",
  "direction-light-blue": "/reference/direction-lock-red.png",
  "eight-pin": "/reference/ten-pin-lock.png",
  "four-number-dials": "/reference/num-dial-lock-horizontal.png",
  "five-number-dials": "/reference/num-vertical-lock.png",
  "vertical-word": "/reference/word-vertical-lock.png",
};

const orderedCabinets: CabinetData[] = Array.from(
  { length: 100 },
  (_, index) => ({
    number: index + 1,
    lock: lockPattern[index % lockPattern.length],
  }),
);

export const cabinetSections = sectionCounts.map((count, index) => {
  const start = sectionCounts
    .slice(0, index)
    .reduce((sum, size) => sum + size, 0);
  return orderedCabinets.slice(start, start + count);
});

export const backgroundOffsets = [-18, -12, -6, 0, 6, 12, 18, 0] as const;
