"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DataConnection, Peer as PeerInstance } from "peerjs";
import { GameSessionProvider } from "../GameSessionContext";
import { puzzles, totalPuzzleCount } from "../puzzles";
import type { GameSession, GameState, MemberIdentity, SubmitAttempt } from "../session";
import { loadHostRevision, loadSolvedPuzzleIds, loadSolveAttributions, saveHostRevision, saveSolvedPuzzleIds, saveSolveAttributions } from "../storage";
import { processAuthoritativeAttempt } from "./authority";
import { realtimeDebug } from "./debug";
import { createJoinUrl, getOrCreateHostPeerId } from "./host-id";
import { isParticipantToHostMessage } from "./protocol";
import type { HostToParticipantMessage } from "./protocol";
import { RecentRequestCache } from "./request-cache";

const initialState: GameState = { solvedPuzzleIds: [], solveAttributions: [] };
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
  const memberByConnectionRef = useRef(new Map<DataConnection, MemberIdentity>());
  const memberConnectionsRef = useRef(new Map<string, DataConnection>());
  const processedRequestsRef = useRef(new RecentRequestCache<HostToParticipantMessage>());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const solvedPuzzleIds = loadSolvedPuzzleIds();
      const solveAttributions = loadSolveAttributions(solvedPuzzleIds);
      const revision = loadHostRevision(solvedPuzzleIds.length);
      const restoredState = { solvedPuzzleIds, solveAttributions };
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
      solveAttributions: [...gameState.solveAttributions],
    };
    connectionsRef.current.forEach((connection) => {
      if (connection.open) sendMessage(connection, message);
    });
  }, []);

  const applyAuthoritativeAttempt = useCallback(async (
    puzzleId: number,
    submittedValues: readonly string[],
    member?: MemberIdentity,
  ) => {
    const attempt = processAuthoritativeAttempt(authorityRef.current, puzzleId, submittedValues, member);
    if (attempt.changed) {
      authorityRef.current = attempt.next;
      setState(attempt.next.gameState);
      saveSolvedPuzzleIds(attempt.next.gameState.solvedPuzzleIds);
      saveSolveAttributions(attempt.next.gameState.solveAttributions);
      saveHostRevision(attempt.next.revision);
      broadcastState();
    }
    return attempt.result;
  }, [broadcastState]);

  const submitAttempt = useCallback<SubmitAttempt>(
    (puzzleId, submittedValues) => applyAuthoritativeAttempt(puzzleId, submittedValues),
    [applyAuthoritativeAttempt],
  );

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
      if (connectionsRef.current.get(connection.peer) === connection) {
        connectionsRef.current.delete(connection.peer);
      }
      const member = memberByConnectionRef.current.get(connection);
      memberByConnectionRef.current.delete(connection);
      if (member && memberConnectionsRef.current.get(member.id) === connection) {
        memberConnectionsRef.current.delete(member.id);
      }
      setConnectedParticipantCount(memberConnectionsRef.current.size);
      realtimeDebug("host", "participant disconnected");
    };

    const sendSnapshot = (connection: DataConnection) => {
      const { gameState, revision } = authorityRef.current;
      sendMessage(connection, {
        type: "SNAPSHOT",
        revision,
        solvedPuzzleIds: [...gameState.solvedPuzzleIds],
        solveAttributions: [...gameState.solveAttributions],
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
        realtimeDebug("host", "participant transport connected");
      });

      connection.on("data", (data) => {
        if (!isParticipantToHostMessage(data)) {
          sendMessage(connection, { type: "HOST_ERROR", code: "MALFORMED_MESSAGE", message: "The host ignored an invalid message." });
          return;
        }

        if (data.type === "HELLO") {
          const connectionMember = memberByConnectionRef.current.get(connection);
          if (connectionMember && connectionMember.id !== data.member.id && memberConnectionsRef.current.get(connectionMember.id) === connection) {
            memberConnectionsRef.current.delete(connectionMember.id);
          }
          const previousConnection = memberConnectionsRef.current.get(data.member.id);
          if (previousConnection && previousConnection !== connection) previousConnection.close();
          memberByConnectionRef.current.set(connection, data.member);
          memberConnectionsRef.current.set(data.member.id, connection);
          setConnectedParticipantCount(memberConnectionsRef.current.size);
          realtimeDebug("host", "member joined or reconnected", { connected: memberConnectionsRef.current.size });
          sendSnapshot(connection);
          return;
        }

        const member = memberByConnectionRef.current.get(connection);
        if (!member) {
          sendMessage(connection, { type: "HOST_ERROR", code: "HELLO_REQUIRED", message: "Introduce this member before requesting game state." });
          return;
        }

        if (data.type === "REQUEST_SNAPSHOT") {
          sendSnapshot(connection);
          return;
        }

        const cacheKey = `${member.id}:${data.requestId}`;
        const cachedResult = processedRequestsRef.current.get(cacheKey);
        if (cachedResult) {
          sendMessage(connection, cachedResult);
          realtimeDebug("host", "duplicate attempt result returned", { puzzleId: data.puzzleId });
          return;
        }

        realtimeDebug("host", "attempt received", { puzzleId: data.puzzleId });
        void applyAuthoritativeAttempt(data.puzzleId, data.answer, member).then((result) => {
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
      memberByConnectionRef.current.clear();
      memberConnectionsRef.current.clear();
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
  }, [applyAuthoritativeAttempt, ready]);

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
    submitAttempt,
  }), [connectedParticipantCount, connectionMessage, connectionStatus, isSolved, joinUrl, ready, state, submitAttempt]);

  return <GameSessionProvider session={session}>{children}</GameSessionProvider>;
}
