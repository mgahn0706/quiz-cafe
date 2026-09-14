"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { useGameSession } from "../game/GameSessionContext";
import { formatElapsedTime, useElapsedSeconds } from "../game/useElapsedSeconds";
import { playUnlockSfx } from "../utils/sfx";
import { findNewlySolvedPuzzleIds } from "./board-events";

const unlockDisplayDuration = 2200;

type BoardUnlock = {
  puzzleId: number;
  nickname?: string;
};

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

function OpenLockMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path className="board-unlock-shackle" d="M20 29V20C20 10 27 5 35 5s15 6 15 16" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <rect x="12" y="27" width="40" height="31" rx="8" fill="currentColor" />
      <circle cx="32" cy="41" r="4" fill="#fff4dc" />
      <path d="M32 44v7" stroke="#fff4dc" strokeWidth="4" strokeLinecap="round" />
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
    connectedMembers = [],
    startTimer,
  } = useGameSession();
  const previousSolvedIds = useRef<Set<number> | null>(null);
  const [boardStarted, setBoardStarted] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<BoardUnlock[]>([]);
  const [recentUnlock, setRecentUnlock] = useState<BoardUnlock | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [joinLinkCopied, setJoinLinkCopied] = useState(false);
  const activeUnlock = unlockQueue[0] ?? null;
  const activeUnlockId = activeUnlock?.puzzleId ?? null;
  const unlockLog = useMemo<BoardUnlock[]>(
    () => [...state.solveAttributions].reverse().map((attribution) => ({
      puzzleId: attribution.puzzleId,
      nickname: attribution.member.nickname,
    })),
    [state.solveAttributions],
  );
  const displayedRecentUnlock = activeUnlock ?? recentUnlock ?? unlockLog[0] ?? null;
  const remainingPuzzleIds = useMemo(
    () => puzzleIds.filter((puzzleId) => !isSolved(puzzleId)),
    [isSolved, puzzleIds],
  );
  const remainingCount = totalPuzzleCount - solvedCount;
  const isLateGame = remainingCount > 0 && remainingCount <= 10;
  const isComplete = ready && totalPuzzleCount > 0 && solvedCount === totalPuzzleCount;
  const elapsedSeconds = useElapsedSeconds(state.timerStartedAt, state.timerStoppedAt);

  const startBoard = () => {
    startTimer?.();
    setBoardStarted(true);
  };

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
        const newUnlocks = newlySolvedIds.map((puzzleId) => ({
          puzzleId,
          nickname: state.solveAttributions.find((attribution) => attribution.puzzleId === puzzleId)?.member.nickname,
        }));
        setUnlockQueue((current) => [...current, ...newUnlocks]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, state.solveAttributions, state.solvedPuzzleIds]);

  useEffect(() => {
    if (!boardStarted || activeUnlock === null) return;

    playUnlockSfx();
    const timer = window.setTimeout(() => {
      setRecentUnlock(activeUnlock);
      setUnlockQueue((current) => current[0]?.puzzleId === activeUnlock.puzzleId ? current.slice(1) : current);
    }, unlockDisplayDuration);

    return () => window.clearTimeout(timer);
  }, [activeUnlock, boardStarted]);

  return (
    <main className={`board-shell${isLateGame ? " board-shell--late" : ""}${isComplete ? " board-shell--complete" : ""}`}>
      <div className="board-ambient board-ambient--one" aria-hidden="true" />
      <div className="board-ambient board-ambient--two" aria-hidden="true" />

      <header className="board-header">
        <div className="board-brand">
          <BoardMark />
          <div><span>Quiz Café</span><strong>Problem Room</strong></div>
          <div className="board-timer" aria-label={`Elapsed room time ${formatElapsedTime(elapsedSeconds)}`}>
            <span>Elapsed</span>
            <time>{formatElapsedTime(elapsedSeconds)}</time>
          </div>
        </div>
        <div className="board-progress" aria-label={`${solvedCount} of ${totalPuzzleCount} puzzles solved`}>
          <span>Team progress</span>
          <strong><b>{solvedCount}</b><i>/</i>{totalPuzzleCount}</strong>
        </div>
        <div className="board-progress-track" aria-hidden="true">
          <i style={{ width: `${totalPuzzleCount === 0 ? 0 : (solvedCount / totalPuzzleCount) * 100}%` }} />
        </div>
        <aside className="board-join-persistent" aria-label="Participant join information">
          <div>
            {qrCodeUrl ? <Image src={qrCodeUrl} alt="QR code for the participant join link" width={112} height={112} unoptimized /> : <span>QR</span>}
          </div>
          <p><strong>Join the room</strong><output>{joinUrl ?? "Connecting…"}</output></p>
        </aside>
      </header>

      <section className="board-content" aria-label="Puzzle room progress board">
        <div className="board-grid" aria-label="All puzzle statuses">
          {puzzleIds.map((puzzleId) => {
            const solved = isSolved(puzzleId);
            const solver = state.solveAttributions.find((attribution) => attribution.puzzleId === puzzleId)?.member.nickname;
            const isUnlocking = puzzleId === activeUnlockId && boardStarted;
            return (
              <div
                className={`board-tile${solved ? " is-solved" : " is-unsolved"}${isUnlocking ? " is-unlocking" : ""}`}
                aria-label={`Puzzle ${puzzleId}, ${solved ? solver ? `solved by ${solver}` : "solved" : "unsolved"}`}
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
            <strong>{displayedRecentUnlock === null ? "—" : String(displayedRecentUnlock.puzzleId).padStart(2, "0")}</strong>
            <small className={displayedRecentUnlock?.nickname ? "board-recent-solver" : undefined}>{displayedRecentUnlock === null ? "Waiting for the team" : displayedRecentUnlock.nickname ? `${displayedRecentUnlock.nickname} solved it` : "Solved before nicknames"}</small>
            <div className="board-unlock-log">
              <span>Unlock log</span>
              {unlockLog.length > 0 ? (
                <ol>
                  {unlockLog.map((unlock, index) => (
                    <li className={index === 0 ? "is-latest" : undefined} key={unlock.puzzleId}>
                      <b>{String(unlock.puzzleId).padStart(2, "0")}</b>
                      <strong>{unlock.nickname}</strong>
                      {index === 0 && <i>Latest</i>}
                    </li>
                  ))}
                </ol>
              ) : <small>New unlocks will appear here</small>}
            </div>
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
          <div className="board-unlock-burst" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--burst-angle": `${index * (360 / 14)}deg`, "--burst-delay": `${(index % 4) * 35}ms` } as CSSProperties} />)}
          </div>
          <div className="board-unlock-lock"><OpenLockMark /></div>
          <span className="board-unlock-who">{activeUnlock?.nickname ?? "The team"}</span>
          <b>Unlocked</b>
          <strong>{String(activeUnlockId).padStart(2, "0")}</strong>
          <em>Puzzle cleared</em>
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
                <div className="board-waiting-members" aria-live="polite">
                  <span>Waiting room</span>
                  {connectedMembers.length > 0
                    ? <ul>{connectedMembers.map((member) => <li key={member.id}>{member.nickname}</li>)}</ul>
                    : <small>No participants connected yet</small>}
                </div>
              </div>
            </div>
            <button className="board-start-button" type="button" disabled={connectionStatus !== "connected"} onClick={startBoard}>
              <strong>Start Board</strong>
              <small>Enables unlock sound</small>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
