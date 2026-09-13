"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { GameSession } from "./session";

const GameSessionContext = createContext<GameSession | null>(null);

export function GameSessionProvider({ children, session }: { children: ReactNode; session: GameSession }) {
  return <GameSessionContext.Provider value={session}>{children}</GameSessionContext.Provider>;
}

export function useGameSession() {
  const session = useContext(GameSessionContext);
  if (!session) throw new Error("useGameSession must be used within a GameSessionProvider");
  return session;
}
