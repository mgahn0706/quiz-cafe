"use client";

import { useEffect, useState } from "react";
import { createInitialPuzzleValues, getLockInputDefinition, isDirectionLock } from "../game/puzzles";
import type { Puzzle } from "../game/puzzles";
import type { SubmitAttempt } from "../game/session";
import { playDialSfx, playDirectionSfx, playPinSfx, playUnlockFailedSfx, playUnlockSfx } from "../utils/sfx";
import { InteractiveLock } from "./InteractiveLock";

type LockChallengeProps = {
  puzzle: Puzzle;
  solved?: boolean;
  onClose: () => void;
  onSubmit: SubmitAttempt;
};

export function LockChallenge({ puzzle, solved = false, onClose, onSubmit }: LockChallengeProps) {
  const inputDefinition = getLockInputDefinition(puzzle.lockType);
  const [values, setValues] = useState(() => createInitialPuzzleValues(puzzle, solved));
  const [result, setResult] = useState<"idle" | "wrong" | "open">(solved ? "open" : "idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const cycle = (index: number, direction: number) => {
    playDialSfx();
    setResult("idle");
    setValues((current) => current.map((value, wheelIndex) => {
      if (wheelIndex !== index) return value;
      const choiceIndex = inputDefinition.choices.indexOf(value);
      return inputDefinition.choices[(choiceIndex + direction + inputDefinition.choices.length) % inputDefinition.choices.length];
    }));
  };

  const check = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const attempt = await onSubmit(puzzle.id, values);
      setResult(attempt.correct ? "open" : "wrong");
      if (attempt.correct && result !== "open") {
        playUnlockSfx();
      } else if (!attempt.correct) {
        playUnlockFailedSfx();
      }
    } finally {
      setSubmitting(false);
    }
  };
  const toggle = (index: number) => {
    playPinSfx();
    setResult("idle");
    setValues((current) => current.map((value, pinIndex) => pinIndex === index ? (value === "1" ? "0" : "1") : value));
  };
  const pushDirection = (direction: string) => {
    playDirectionSfx();
    setResult("idle");
    setValues((current) => [...current, direction]);
  };
  const resetDirection = () => {
    setResult("idle");
    setValues([]);
  };

  return (
    <section className={`lock-challenge lock-challenge--${result}`} role="dialog" aria-modal="true" aria-labelledby="lock-title">
      <header className="challenge-header">
        <div><span>Cabinet</span><strong>#{puzzle.id}</strong></div>
        <button type="button" onClick={onClose} aria-label="Close lock">×</button>
      </header>
      <div className="challenge-stage">
        <div className="challenge-copy"><span className="challenge-kicker">Match the café clue</span><h2 id="lock-title">Manipulate the lock</h2><div className="lock-clue" aria-label={`Combination clue ${puzzle.clue}`}>{puzzle.clue}</div></div>
        <div className="direct-lock-area"><InteractiveLock type={puzzle.lockType} values={values} choices={inputDefinition.choices} open={result === "open"} disabled={result === "open" || submitting} onCycle={cycle} onToggle={toggle} onDirection={pushDirection} onReset={resetDirection} /></div>
        <p className="challenge-result" role="status">{result === "wrong" ? "Not quite—check the clue and try again." : result === "open" ? "Click! Cabinet unlocked." : inputDefinition.mode === "pins" ? "Press the pins directly." : isDirectionLock(puzzle.lockType) ? "Tap or swipe the dial. Tap the silver ring to reset." : "Swipe each wheel vertically."}</p>
        <button className="unlock-button" type="button" disabled={submitting} onClick={() => void check()}>{result === "open" ? "Unlocked ✓" : "Unlock"}</button>
      </div>
    </section>
  );
}
