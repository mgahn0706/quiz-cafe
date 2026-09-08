"use client";

import { useEffect, useState } from "react";
import type { CabinetData, LockType } from "../config/cabinets";
import { playDialSfx, playDirectionSfx, playPinSfx, playUnlockFailedSfx, playUnlockSfx } from "../utils/sfx";
import { InteractiveLock } from "./InteractiveLock";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numbers = "0123456789".split("");
const directions = ["↑", "→", "↓", "←"];

type LockSpec = { choices: string[]; target: string[]; mode: "wheels" | "pins"; clue: string };

function lockSpec(type: LockType): LockSpec {
  if (type === "five-letter") return { choices: alphabet, target: ["C", "A", "F", "E", "S"], mode: "wheels", clue: "CAFES" };
  if (type === "vertical-word") return { choices: alphabet, target: ["C", "A", "F", "E"], mode: "wheels", clue: "CAFE" };
  if (type === "four-number-dials") return { choices: numbers, target: ["0", "0", "0", "0"], mode: "wheels", clue: "0000" };
  if (type === "five-number-dials") return { choices: numbers, target: ["6", "6", "5", "6", "6"], mode: "wheels", clue: "66566" };
  if (type === "eight-pin") return { choices: ["0", "1"], target: ["1", "0", "1", "1", "0", "1", "0", "0"], mode: "pins", clue: "● ○ ● ●  ○ ● ○ ○" };
  return { choices: directions, target: ["↑", "→", "↓", "←"], mode: "wheels", clue: "↑ → ↓ ←" };
}

type LockChallengeProps = { cabinet: CabinetData; solved?: boolean; onClose: () => void; onSolved: (cabinet: number) => void };

export function LockChallenge({ cabinet, solved = false, onClose, onSolved }: LockChallengeProps) {
  const spec = lockSpec(cabinet.lock);
  const [values, setValues] = useState(() => solved ? [...spec.target] : cabinet.lock.startsWith("direction-") ? [] : spec.target.map((value, index) => {
    const targetIndex = spec.choices.indexOf(value);
    return spec.choices[(targetIndex + index + 1) % spec.choices.length];
  }));
  const [result, setResult] = useState<"idle" | "wrong" | "open">(solved ? "open" : "idle");

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
      const choiceIndex = spec.choices.indexOf(value);
      return spec.choices[(choiceIndex + direction + spec.choices.length) % spec.choices.length];
    }));
  };

  const check = () => {
    const solved = values.length === spec.target.length && values.every((value, index) => value === spec.target[index]);
    setResult(solved ? "open" : "wrong");
    if (solved && result !== "open") {
      playUnlockSfx();
      onSolved(cabinet.number);
    } else if (!solved) {
      playUnlockFailedSfx();
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
    setValues((current) => [...current, direction].slice(-spec.target.length));
  };
  const resetDirection = () => {
    setResult("idle");
    setValues([]);
  };

  return (
    <section className={`lock-challenge lock-challenge--${result}`} role="dialog" aria-modal="true" aria-labelledby="lock-title">
      <header className="challenge-header">
        <div><span>Cabinet</span><strong>#{cabinet.number}</strong></div>
        <button type="button" onClick={onClose} aria-label="Close lock">×</button>
      </header>
      <div className="challenge-stage">
        <div className="challenge-copy"><span className="challenge-kicker">Match the café clue</span><h2 id="lock-title">Manipulate the lock</h2><div className="lock-clue" aria-label={`Combination clue ${spec.clue}`}>{spec.clue}</div></div>
        <div className="direct-lock-area"><InteractiveLock type={cabinet.lock} values={values} choices={spec.choices} open={result === "open"} disabled={result === "open"} onCycle={cycle} onToggle={toggle} onDirection={pushDirection} onReset={resetDirection} /></div>
        <p className="challenge-result" role="status">{result === "wrong" ? "Not quite—check the clue and try again." : result === "open" ? "Click! Cabinet unlocked." : spec.mode === "pins" ? "Press the pins directly." : cabinet.lock.startsWith("direction-") ? "Tap or swipe the dial. Tap the silver ring to reset." : "Swipe each wheel vertically."}</p>
        <button className="unlock-button" type="button" onClick={check}>{result === "open" ? "Unlocked ✓" : "Unlock"}</button>
      </div>
    </section>
  );
}
