"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GameSessionProvider } from "./GameSessionContext";
import { getPuzzleById, totalPuzzleCount } from "./puzzles";
import type { GameSession, GameState, SubmitAttempt } from "./session";
import { loadSolvedPuzzleIds, saveSolvedPuzzleIds } from "./storage";
import { validateAttempt } from "./validation";

const initialState: GameState = { solvedPuzzleIds: [] };

export function LocalGameSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restoredState = { solvedPuzzleIds: loadSolvedPuzzleIds() };
      stateRef.current = restoredState;
      setState(restoredState);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const submitAttempt = useCallback<SubmitAttempt>(async (puzzleId, submittedValues) => {
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle || !validateAttempt(puzzle, submittedValues)) {
      return { correct: false, alreadySolved: false };
    }

    const alreadySolved = stateRef.current.solvedPuzzleIds.includes(puzzleId);
    if (!alreadySolved) {
      const solvedPuzzleIds = [...stateRef.current.solvedPuzzleIds, puzzleId].sort((a, b) => a - b);
      const nextState = { solvedPuzzleIds };
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
    solvedCount: state.solvedPuzzleIds.length,
    totalPuzzleCount,
    isSolved,
    submitAttempt,
  }), [isSolved, state, submitAttempt]);

  return <GameSessionProvider session={session}>{children}</GameSessionProvider>;
}
