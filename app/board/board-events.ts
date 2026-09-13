export function findNewlySolvedPuzzleIds(
  previousSolvedIds: ReadonlySet<number>,
  currentSolvedIds: readonly number[],
) {
  return currentSolvedIds.filter((puzzleId) => !previousSolvedIds.has(puzzleId));
}
