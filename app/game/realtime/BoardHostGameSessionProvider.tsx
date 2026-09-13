"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DataConnection, Peer as PeerInstance } from "peerjs";
import { GameSessionProvider } from "../GameSessionContext";
import { puzzles, totalPuzzleCount } from "../puzzles";
import type { GameSession, GameState, SubmitAttempt } from "../session";
import { loadHostRevision, loadSolvedPuzzleIds, saveHostRevision, saveSolvedPuzzleIds } from "../storage";
import { processAuthoritativeAttempt } from "./authority";
import { realtimeDebug } from "./debug";
import { createJoinUrl, getOrCreateHostPeerId } from "./host-id";
import { isParticipantToHostMessage } from "./protocol";
import type { HostToParticipantMessage } from "./protocol";
import { RecentRequestCache } from "./request-cache";

const initialState: GameState = { solvedPuzzleIds: [] };
const puzzleIds = puzzles.map((puzzle) => puzzle.id);
const maxHostIdReclaimAttempts = 6;

function sendMessage(connection: DataConnection, message: HostToParticipantMessage) {
  try {
    void Promise.resolve(connection.send(message)).catch(() => undefined);
  } catch {
    // Connection close/error handlers own recovery.
  }
}

export function BoardHostGameSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<GameSession["connectionStatus"]>("connecting");
  const [connectionMessage, setConnectionMessage] = useState("Preparing the board host…");
  const [joinUrl, setJoinUrl] = useState<string>();
  const [connectedParticipantCount, setConnectedParticipantCount] = useState(0);
  const authorityRef = useRef({ gameState: initialState, revision: 0 });
  const connectionsRef = useRef(new Map<string, DataConnection>());
  const processedRequestsRef = useRef(new RecentRequestCache<HostToParticipantMessage>());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const solvedPuzzleIds = loadSolvedPuzzleIds();
      const revision = loadHostRevision(solvedPuzzleIds.length);
      const restoredState = { solvedPuzzleIds };
      authorityRef.current = { gameState: restoredState, revision };
      setState(restoredState);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const broadcastState = useCallback(() => {
    const { gameState, revision } = authorityRef.current;
    const message: HostToParticipantMessage = {
      type: "STATE_UPDATE",
      revision,
      solvedPuzzleIds: [...gameState.solvedPuzzleIds],
    };
    connectionsRef.current.forEach((connection) => {
      if (connection.open) sendMessage(connection, message);
    });
  }, []);

  const applyAttempt = useCallback<SubmitAttempt>(async (puzzleId, submittedValues) => {
    const attempt = processAuthoritativeAttempt(authorityRef.current, puzzleId, submittedValues);
    if (attempt.changed) {
      authorityRef.current = attempt.next;
      setState(attempt.next.gameState);
      saveSolvedPuzzleIds(attempt.next.gameState.solvedPuzzleIds);
      saveHostRevision(attempt.next.revision);
      broadcastState();
    }
    return attempt.result;
  }, [broadcastState]);

  useEffect(() => {
    if (!ready) return;

    let disposed = false;
    let activePeer: PeerInstance | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reclaimAttempts = 0;
    const hostPeerId = getOrCreateHostPeerId();

    const clearReconnectTimer = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const removeConnection = (connection: DataConnection) => {
      if (connectionsRef.current.get(connection.peer) !== connection) return;
      connectionsRef.current.delete(connection.peer);
      setConnectedParticipantCount(connectionsRef.current.size);
      realtimeDebug("host", "participant disconnected");
    };

    const sendSnapshot = (connection: DataConnection) => {
      const { gameState, revision } = authorityRef.current;
      sendMessage(connection, {
        type: "SNAPSHOT",
        revision,
        solvedPuzzleIds: [...gameState.solvedPuzzleIds],
        puzzleIds: [...puzzleIds],
        totalPuzzleCount,
      });
      realtimeDebug("host", "snapshot sent", { revision, solvedCount: gameState.solvedPuzzleIds.length });
    };

    const attachConnection = (connection: DataConnection) => {
      connection.on("open", () => {
        if (disposed) return;
        const existing = connectionsRef.current.get(connection.peer);
        if (existing && existing !== connection) existing.close();
        connectionsRef.current.set(connection.peer, connection);
        setConnectedParticipantCount(connectionsRef.current.size);
        realtimeDebug("host", "participant connected", { connected: connectionsRef.current.size });
      });

      connection.on("data", (data) => {
        if (!isParticipantToHostMessage(data)) {
          sendMessage(connection, { type: "HOST_ERROR", code: "MALFORMED_MESSAGE", message: "The host ignored an invalid message." });
          return;
        }

        if (data.type === "HELLO" || data.type === "REQUEST_SNAPSHOT") {
          sendSnapshot(connection);
          return;
        }

        const cacheKey = `${connection.peer}:${data.requestId}`;
        const cachedResult = processedRequestsRef.current.get(cacheKey);
        if (cachedResult) {
          sendMessage(connection, cachedResult);
          realtimeDebug("host", "duplicate attempt result returned", { puzzleId: data.puzzleId });
          return;
        }

        realtimeDebug("host", "attempt received", { puzzleId: data.puzzleId });
        void applyAttempt(data.puzzleId, data.answer).then((result) => {
          const response: HostToParticipantMessage = {
            type: "ATTEMPT_RESULT",
            requestId: data.requestId,
            puzzleId: data.puzzleId,
            correct: result.correct,
            alreadySolved: result.alreadySolved,
          };
          processedRequestsRef.current.set(cacheKey, response);
          sendMessage(connection, response);
          realtimeDebug("host", "attempt result returned", { puzzleId: data.puzzleId, correct: result.correct, alreadySolved: result.alreadySolved });
        });
      });

      connection.on("close", () => removeConnection(connection));
      connection.on("error", (error) => {
        realtimeDebug("host", "data connection error", { type: error.type });
        removeConnection(connection);
      });
    };

    const closeParticipantConnections = () => {
      connectionsRef.current.forEach((connection) => connection.close());
      connectionsRef.current.clear();
      setConnectedParticipantCount(0);
    };

    void import("peerjs").then(({ Peer }) => {
      const createHostPeer = () => {
        if (disposed) return;
        clearReconnectTimer();
        setConnectionStatus(reclaimAttempts > 0 ? "reconnecting" : "connecting");
        setConnectionMessage(reclaimAttempts > 0 ? "Waiting to reclaim the existing board address…" : "Connecting the board host…");

        const peer = new Peer(hostPeerId, { debug: 0 });
        activePeer = peer;

        peer.on("open", (openedPeerId) => {
          if (disposed || activePeer !== peer) return;
          reclaimAttempts = 0;
          setConnectionStatus("connected");
          setConnectionMessage("Ready for participants");
          setJoinUrl(createJoinUrl(openedPeerId));
          realtimeDebug("host", "host Peer opened", { peerId: openedPeerId });
        });

        peer.on("connection", attachConnection);

        peer.on("disconnected", () => {
          if (disposed || activePeer !== peer) return;
          setConnectionStatus("reconnecting");
          setConnectionMessage("Reconnecting the board host…");
          realtimeDebug("host", "PeerJS signaling disconnected");
          clearReconnectTimer();
          reconnectTimer = setTimeout(() => {
            if (!disposed && !peer.destroyed && peer.disconnected) peer.reconnect();
          }, 1500);
        });

        peer.on("error", (error) => {
          if (disposed || activePeer !== peer) return;
          realtimeDebug("host", "PeerJS error", { type: error.type });

          if (error.type === "unavailable-id") {
            peer.destroy();
            activePeer = null;
            closeParticipantConnections();
            reclaimAttempts += 1;
            setJoinUrl(undefined);
            if (reclaimAttempts <= maxHostIdReclaimAttempts) {
              setConnectionStatus("reconnecting");
              setConnectionMessage("The saved board address is still active. Retrying the same address…");
              reconnectTimer = setTimeout(createHostPeer, Math.min(1500 * 2 ** (reclaimAttempts - 1), 10000));
            } else {
              setConnectionStatus("error");
              setConnectionMessage("The saved board address is in use by another board. Close the other board and reload this page.");
            }
            return;
          }

          setConnectionStatus("error");
          setConnectionMessage("The board could not reach the PeerJS service. Check this device’s connection and reload.");
        });

        peer.on("close", () => {
          if (disposed || activePeer !== peer) return;
          setConnectionStatus("disconnected");
          setConnectionMessage("The board host has stopped.");
          setJoinUrl(undefined);
        });
      };

      createHostPeer();
    }).catch(() => {
      if (disposed) return;
      setConnectionStatus("error");
      setConnectionMessage("The board could not initialize peer-to-peer connections.");
    });

    return () => {
      disposed = true;
      clearReconnectTimer();
      closeParticipantConnections();
      activePeer?.destroy();
    };
  }, [applyAttempt, ready]);

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
    joinUrl,
    connectedParticipantCount,
    isSolved,
    submitAttempt: applyAttempt,
  }), [applyAttempt, connectedParticipantCount, connectionMessage, connectionStatus, isSolved, joinUrl, ready, state]);

  return <GameSessionProvider session={session}>{children}</GameSessionProvider>;
}
