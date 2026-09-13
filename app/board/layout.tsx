import type { ReactNode } from "react";
import { BoardHostGameSessionProvider } from "../game/realtime/BoardHostGameSessionProvider";

export default function BoardLayout({ children }: { children: ReactNode }) {
  return <BoardHostGameSessionProvider>{children}</BoardHostGameSessionProvider>;
}
