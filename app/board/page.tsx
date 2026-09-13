"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { useGameSession } from "../game/GameSessionContext";
import { playUnlockSfx } from "../utils/sfx";
import { findNewlySolvedPuzzleIds } from "./board-events";

const unlockDisplayDuration = 1600;

function BoardMark() {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <path d="M9 20h28v12a11 11 0 0 1-11 11h-6A11 11 0 0 1 9 32Z" fill="#fff7e9" stroke="currentColor" strokeWidth="2.6" />
      <path d="M37 24h3a6 6 0 0 1 0 12h-4" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 14c-3-4 3-5 0-9M25 14c-3-4 3-5 0-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 45h39" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export default function BoardPage() {
  const {
    state,
    puzzleIds,
    solvedCount,
    totalPuzzleCount,
    ready,
    isSolved,
    connectionStatus,
    connectionMessage,
    joinUrl,
    connectedParticipantCount = 0,
  } = useGameSession();
  const previousSolvedIds = useRef<Set<number> | null>(null);
  const [boardStarted, setBoardStarted] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<number[]>([]);
  const [recentPuzzleId, setRecentPuzzleId] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [joinLinkCopied, setJoinLinkCopied] = useState(false);
  const activeUnlockId = unlockQueue[0] ?? null;
  const remainingPuzzleIds = useMemo(
    () => puzzleIds.filter((puzzleId) => !isSolved(puzzleId)),
    [isSolved, puzzleIds],
  );
  const remainingCount = totalPuzzleCount - solvedCount;
  const isLateGame = remainingCount > 0 && remainingCount <= 10;
  const isComplete = ready && totalPuzzleCount > 0 && solvedCount === totalPuzzleCount;

  useEffect(() => {
    let cancelled = false;
    if (!joinUrl) return;

    void QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#3c2923", light: "#fff4dc" },
    }).then((url) => {
      if (!cancelled) setQrCodeUrl(url);
    }).catch(() => {
      if (!cancelled) setQrCodeUrl("");
    });

    return () => { cancelled = true; };
  }, [joinUrl]);

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setJoinLinkCopied(true);
      window.setTimeout(() => setJoinLinkCopied(false), 1800);
    } catch {
      setJoinLinkCopied(false);
    }
  };

  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => {
      const currentSolvedIds = new Set(state.solvedPuzzleIds);
      if (previousSolvedIds.current === null) {
        previousSolvedIds.current = currentSolvedIds;
        return;
      }

      const newlySolvedIds = findNewlySolvedPuzzleIds(previousSolvedIds.current, state.solvedPuzzleIds);
      previousSolvedIds.current = currentSolvedIds;
      if (newlySolvedIds.length > 0) {
        setUnlockQueue((current) => [...current, ...newlySolvedIds]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, state.solvedPuzzleIds]);

  useEffect(() => {
    if (!boardStarted || activeUnlockId === null) return;

    playUnlockSfx();
    const timer = window.setTimeout(() => {
      setRecentPuzzleId(activeUnlockId);
      setUnlockQueue((current) => current[0] === activeUnlockId ? current.slice(1) : current);
    }, unlockDisplayDuration);

    return () => window.clearTimeout(timer);
  }, [activeUnlockId, boardStarted]);

  return (
    <main className={`board-shell${isLateGame ? " board-shell--late" : ""}${isComplete ? " board-shell--complete" : ""}`}>
      <div className="board-ambient board-ambient--one" aria-hidden="true" />
      <div className="board-ambient board-ambient--two" aria-hidden="true" />

      <header className="board-header">
        <div className="board-brand">
          <BoardMark />
          <div><span>Quiz Café</span><strong>Problem Room</strong></div>
        </div>
        <div className="board-progress" aria-label={`${solvedCount} of ${totalPuzzleCount} puzzles solved`}>
          <span>Team progress</span>
          <strong><b>{solvedCount}</b><i>/</i>{totalPuzzleCount}</strong>
        </div>
        <div className="board-progress-track" aria-hidden="true">
          <i style={{ width: `${totalPuzzleCount === 0 ? 0 : (solvedCount / totalPuzzleCount) * 100}%` }} />
        </div>
      </header>

      <section className="board-content" aria-label="Puzzle room progress board">
        <div className="board-grid" aria-label="All puzzle statuses">
          {puzzleIds.map((puzzleId) => {
            const solved = isSolved(puzzleId);
            const isUnlocking = puzzleId === activeUnlockId && boardStarted;
            return (
              <div
                className={`board-tile${solved ? " is-solved" : " is-unsolved"}${isUnlocking ? " is-unlocking" : ""}`}
                aria-label={`Puzzle ${puzzleId}, ${solved ? "solved" : "unsolved"}`}
                key={puzzleId}
              >
                <span>{String(puzzleId).padStart(2, "0")}</span>
                <i aria-hidden="true">{solved ? "✓" : ""}</i>
              </div>
            );
          })}
        </div>

        <aside className="board-sidebar">
          <section className="board-recent" aria-live="polite">
            <span>Recently unlocked</span>
            <strong>{recentPuzzleId === null ? "—" : String(recentPuzzleId).padStart(2, "0")}</strong>
            <small>{recentPuzzleId === null ? "Waiting for the team" : "Great work, everyone"}</small>
          </section>

          <section className={`board-remaining${isLateGame ? " is-visible" : ""}`} aria-hidden={!isLateGame}>
            <span>Remaining</span>
            <div>{remainingPuzzleIds.map((puzzleId) => <strong key={puzzleId}>{String(puzzleId).padStart(2, "0")}</strong>)}</div>
            <small>Find the final locks</small>
          </section>
        </aside>
      </section>

      {activeUnlockId !== null && boardStarted && (
        <div className="board-unlock-event" role="status" aria-live="assertive" key={activeUnlockId}>
          <span>Puzzle</span>
          <strong>{String(activeUnlockId).padStart(2, "0")}</strong>
          <b>Unlocked</b>
        </div>
      )}

      {isComplete && boardStarted && (
        <section className="board-completion" role="status" aria-live="assertive">
          <span>100 problem room</span>
          <strong>All unlocked</strong>
          <p>We solved it together.</p>
        </section>
      )}

      {!boardStarted && (
        <div className="board-start">
          <section className="board-setup" aria-label="Start the room board">
            <BoardMark />
            <span className="board-setup-kicker">Problem Room</span>
            <h1>Join this game</h1>
            <div className="board-setup-join">
              <div className="board-setup-qr">
                {qrCodeUrl ? <Image src={qrCodeUrl} alt="QR code for the participant join link" width={320} height={320} unoptimized /> : <span>Preparing QR…</span>}
              </div>
              <div className="board-setup-details">
                <p>Scan with a phone to open the participant locks.</p>
                <output>{joinUrl ?? "Preparing the board address…"}</output>
                <button className="board-copy-link" type="button" disabled={!joinUrl} onClick={() => void copyJoinLink()}>{joinLinkCopied ? "Copied" : "Copy join link"}</button>
                <dl>
                  <div><dt>Board</dt><dd data-status={connectionStatus}>{connectionMessage ?? connectionStatus}</dd></div>
                  <div><dt>Connected devices</dt><dd>{connectedParticipantCount}</dd></div>
                </dl>
              </div>
            </div>
            <button className="board-start-button" type="button" disabled={connectionStatus !== "connected"} onClick={() => setBoardStarted(true)}>
              <strong>Start Board</strong>
              <small>Enables unlock sound</small>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
