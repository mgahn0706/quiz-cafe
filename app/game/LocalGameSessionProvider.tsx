"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GameSessionProvider } from "./GameSessionContext";
import { getPuzzleById, puzzles, totalPuzzleCount } from "./puzzles";
import type { GameSession, GameState, SubmitAttempt } from "./session";
import { loadSolvedPuzzleIds, saveSolvedPuzzleIds, subscribeToSolvedPuzzleIds } from "./storage";
import { validateAttempt } from "./validation";

const initialState: GameState = { solvedPuzzleIds: [], solveAttributions: [] };
const puzzleIds = puzzles.map((puzzle) => puzzle.id);

export function LocalGameSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restoredState = { solvedPuzzleIds: loadSolvedPuzzleIds(), solveAttributions: [] };
      stateRef.current = restoredState;
      setState(restoredState);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => subscribeToSolvedPuzzleIds((solvedPuzzleIds) => {
    const nextState = { solvedPuzzleIds, solveAttributions: [] };
    stateRef.current = nextState;
    setState(nextState);
  }), []);

  const submitAttempt = useCallback<SubmitAttempt>(async (puzzleId, submittedValues) => {
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle || !validateAttempt(puzzle, submittedValues)) {
      return { correct: false, alreadySolved: false };
    }

    const alreadySolved = stateRef.current.solvedPuzzleIds.includes(puzzleId);
    if (!alreadySolved) {
      const solvedPuzzleIds = [...stateRef.current.solvedPuzzleIds, puzzleId].sort((a, b) => a - b);
      const nextState = { solvedPuzzleIds, solveAttributions: stateRef.current.solveAttributions };
      stateRef.current = nextState;
      setState(nextState);
      saveSolvedPuzzleIds(solvedPuzzleIds);
    }

    return { correct: true, alreadySolved };
  }, []);

  const isSolved = useCallback(
    (puzzleId: number) => state.solvedPuzzleIds.includes(puzzleId),
    [state.solvedPuzzleIds],
  );

  const session = useMemo<GameSession>(() => ({
    state,
    puzzleIds,
    solvedCount: state.solvedPuzzleIds.length,
    totalPuzzleCount,
    ready,
    connectionStatus: "local",
    isSolved,
    submitAttempt,
  }), [isSolved, ready, state, submitAttempt]);

  return <GameSessionProvider session={session}>{children}</GameSessionProvider>;
}
