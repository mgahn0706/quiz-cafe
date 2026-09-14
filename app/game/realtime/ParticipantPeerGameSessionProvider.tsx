"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DataConnection, Peer as PeerInstance } from "peerjs";
import { GameSessionProvider } from "../GameSessionContext";
import type { AttemptResult, GameSession, GameState, MemberIdentity, SubmitAttempt } from "../session";
import { realtimeDebug } from "./debug";
import { isSafePeerId } from "./host-id";
import {
  isHostToParticipantMessage,
  realtimeProtocolVersion,
  shouldApplyRevision,
} from "./protocol";
import type { ParticipantToHostMessage } from "./protocol";

const attemptTimeoutMs = 10_000;
const initialState: GameState = { solvedPuzzleIds: [], solveAttributions: [], timerStartedAt: null, timerStoppedAt: null };

type PendingAttempt = {
  puzzleId: number;
  resolve: (result: AttemptResult) => void;
  timeout: ReturnType<typeof setTimeout>;
};

function sendMessage(connection: DataConnection, message: ParticipantToHostMessage) {
  try {
    void Promise.resolve(connection.send(message)).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

function unavailableResult(
  error: NonNullable<AttemptResult["error"]>,
  message: string,
): AttemptResult {
  return { correct: false, alreadySolved: false, error, message };
}

export function ParticipantPeerGameSessionProvider({
  hostPeerId,
  member,
  children,
}: {
  hostPeerId: string;
  member: MemberIdentity;
  children: ReactNode;
}) {
  const validHostPeerId = isSafePeerId(hostPeerId);
  const [state, setState] = useState<GameState>(initialState);
  const [puzzleIds, setPuzzleIds] = useState<readonly number[]>([]);
  const [totalPuzzleCount, setTotalPuzzleCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<GameSession["connectionStatus"]>(validHostPeerId ? "connecting" : "error");
  const [connectionMessage, setConnectionMessage] = useState(validHostPeerId ? "Connecting to the room board…" : "This join link contains an invalid board address.");
  const latestRevisionRef = useRef(-1);
  const connectionRef = useRef<DataConnection | null>(null);
  const pendingAttemptsRef = useRef(new Map<string, PendingAttempt>());

  const rejectPendingAttempts = useCallback((message: string) => {
    pendingAttemptsRef.current.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.resolve(unavailableResult("transport-error", message));
    });
    pendingAttemptsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!validHostPeerId) return;

    let disposed = false;
    let peer: PeerInstance | null = null;
    let connection: DataConnection | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;

    const clearRetryTimer = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleConnection = () => {
      if (disposed || retryTimer) return;
      retryAttempt += 1;
      const delay = Math.min(1000 * 2 ** (retryAttempt - 1), 10_000);
      setConnectionStatus("reconnecting");
      setConnectionMessage("Connection lost. Reconnecting to the room board…");
      realtimeDebug("participant", "reconnect attempt scheduled", { attempt: retryAttempt, delay });
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectToHost();
      }, delay);
    };

    const handleClosedConnection = (closedConnection: DataConnection) => {
      if (disposed || connection !== closedConnection) return;
      connection = null;
      connectionRef.current = null;
      rejectPendingAttempts("The connection was lost before the board answered.");
      realtimeDebug("participant", "participant disconnected");
      scheduleConnection();
    };

    const connectToHost = () => {
      if (disposed || !peer || peer.destroyed || peer.disconnected) return;
      clearRetryTimer();
      const previousConnection = connection;
      connection = null;
      connectionRef.current = null;
      previousConnection?.close();
      setConnectionStatus(retryAttempt > 0 ? "reconnecting" : "connecting");
      setConnectionMessage(retryAttempt > 0 ? "Reconnecting to the room board…" : "Connecting to the room board…");

      const nextConnection = peer.connect(hostPeerId, {
        label: "problem-room-game-session",
        reliable: true,
        serialization: "json",
      });
      connection = nextConnection;
      connectionRef.current = nextConnection;

      nextConnection.on("open", () => {
        if (disposed || connection !== nextConnection) return;
        clearRetryTimer();
        retryAttempt = 0;
        setConnectionStatus("connected");
        setConnectionMessage("Connected to the room board");
        sendMessage(nextConnection, { type: "HELLO", protocolVersion: realtimeProtocolVersion, member });
        realtimeDebug("participant", "participant connected");
      });

      nextConnection.on("data", (data) => {
        if (!isHostToParticipantMessage(data)) return;

        if (data.type === "SNAPSHOT") {
          if (data.revision < latestRevisionRef.current) return;
          latestRevisionRef.current = data.revision;
          setState({ solvedPuzzleIds: data.solvedPuzzleIds, solveAttributions: data.solveAttributions, timerStartedAt: data.timerStartedAt, timerStoppedAt: data.timerStoppedAt });
          setPuzzleIds(data.puzzleIds);
          setTotalPuzzleCount(data.totalPuzzleCount);
          setReady(true);
          realtimeDebug("participant", "snapshot received", { revision: data.revision, solvedCount: data.solvedPuzzleIds.length });
          return;
        }

        if (data.type === "STATE_UPDATE") {
          if (!shouldApplyRevision(latestRevisionRef.current, data.revision)) return;
          latestRevisionRef.current = data.revision;
          setState({ solvedPuzzleIds: data.solvedPuzzleIds, solveAttributions: data.solveAttributions, timerStartedAt: data.timerStartedAt, timerStoppedAt: data.timerStoppedAt });
          return;
        }

        if (data.type === "ATTEMPT_RESULT") {
          const pending = pendingAttemptsRef.current.get(data.requestId);
          if (!pending || pending.puzzleId !== data.puzzleId) return;
          pendingAttemptsRef.current.delete(data.requestId);
          clearTimeout(pending.timeout);
          pending.resolve({ correct: data.correct, alreadySolved: data.alreadySolved });
          return;
        }

        setConnectionStatus("error");
        setConnectionMessage(data.message ?? "The room board rejected a network message.");
      });

      nextConnection.on("close", () => handleClosedConnection(nextConnection));
      nextConnection.on("error", (error) => {
        realtimeDebug("participant", "data connection error", { type: error.type });
        handleClosedConnection(nextConnection);
      });
    };

    void import("peerjs").then(({ Peer }) => {
      if (disposed) return;
      peer = new Peer({ debug: 0 });

      peer.on("open", () => connectToHost());
      peer.on("disconnected", () => {
        if (disposed || !peer) return;
        realtimeDebug("participant", "PeerJS signaling disconnected");
        setConnectionStatus("reconnecting");
        setConnectionMessage("Reconnecting to the PeerJS service…");
        clearRetryTimer();
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!disposed && peer && !peer.destroyed && peer.disconnected) peer.reconnect();
        }, 1500);
      });
      peer.on("error", (error) => {
        if (disposed) return;
        realtimeDebug("participant", "PeerJS error", { type: error.type });
        if (error.type === "peer-unavailable" || error.type === "network" || error.type === "disconnected") {
          scheduleConnection();
          return;
        }
        setConnectionStatus("error");
        setConnectionMessage("This device could not connect to the room board. Check the join link and network.");
      });
      peer.on("close", () => {
        if (disposed) return;
        setConnectionStatus("disconnected");
        setConnectionMessage("The connection to the room board has stopped.");
      });
    }).catch(() => {
      if (disposed) return;
      setConnectionStatus("error");
      setConnectionMessage("This device could not initialize peer-to-peer connections.");
    });

    return () => {
      disposed = true;
      clearRetryTimer();
      rejectPendingAttempts("The game connection was closed.");
      connectionRef.current = null;
      connection?.close();
      peer?.destroy();
    };
  }, [hostPeerId, member, rejectPendingAttempts, validHostPeerId]);

  const submitAttempt = useCallback<SubmitAttempt>(async (puzzleId, submittedValues) => {
    const connection = connectionRef.current;
    if (!connection?.open) {
      return unavailableResult("not-connected", "Reconnect to the room board before unlocking.");
    }

    const requestId = crypto.randomUUID();
    return new Promise<AttemptResult>((resolve) => {
      const timeout = setTimeout(() => {
        pendingAttemptsRef.current.delete(requestId);
        resolve(unavailableResult("timeout", "The room board did not answer. Try again after reconnecting."));
      }, attemptTimeoutMs);
      pendingAttemptsRef.current.set(requestId, { puzzleId, resolve, timeout });

      const sent = sendMessage(connection, {
        type: "SUBMIT_ATTEMPT",
        requestId,
        puzzleId,
        answer: [...submittedValues],
      });
      if (!sent) {
        clearTimeout(timeout);
        pendingAttemptsRef.current.delete(requestId);
        resolve(unavailableResult("transport-error", "The attempt could not be sent to the room board."));
      }
    });
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
    connectionStatus,
    connectionMessage,
    currentMember: member,
    isSolved,
    submitAttempt,
  }), [connectionMessage, connectionStatus, isSolved, member, puzzleIds, ready, state, submitAttempt, totalPuzzleCount]);

  return <GameSessionProvider session={session}>{children}</GameSessionProvider>;
}
