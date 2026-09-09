"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import type { LockType } from "../config/cabinets";

type InteractiveLockProps = {
  type: LockType;
  values: string[];
  choices: string[];
  open: boolean;
  disabled?: boolean;
  onCycle: (index: number, direction: number) => void;
  onToggle: (index: number) => void;
  onDirection: (direction: string) => void;
  onReset: () => void;
};

const isDirection = (type: LockType) => type.startsWith("direction-");

const wheelStep = 48;

export function InteractiveLock({ type, values, choices, open, disabled = false, onCycle, onToggle, onDirection, onReset }: InteractiveLockProps) {
  const wheelStart = useRef<{ index: number; x: number; y: number } | null>(null);
  const directionStart = useRef<{ x: number; y: number } | null>(null);
  const settleTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [wheelOffsets, setWheelOffsets] = useState<number[]>(() => values.map(() => 0));
  const [draggingWheel, setDraggingWheel] = useState<number | null>(null);
  const [settlingWheels, setSettlingWheels] = useState<number[]>([]);
  const [resetPulse, setResetPulse] = useState(0);
  const [directionOffset, setDirectionOffset] = useState({ x: 0, y: 0 });
  const [directionSettling, setDirectionSettling] = useState(false);
  const wheelCount = values.length;
  const wheelWidth = wheelCount === 5 ? 48 : 58;
  const wheelGap = 7;
  const controlsWidth = wheelCount * wheelWidth + (wheelCount - 1) * wheelGap;
  const controlsStart = (420 - controlsWidth) / 2;
  const bodyColor = type === "direction-red" ? "#bd2f2c" : type === "direction-black" ? "#26292c" : type === "direction-light-blue" ? "#78c5d5" : type === "five-letter-red" ? "#e34645" : type === "five-letter-blue" ? "#2998e5" : type === "vertical-word" ? "#f0eee7" : "#c9c9c4";
  const wheelColor = type === "five-letter-red" ? "#c92336" : type === "five-letter-blue" ? "#0875cb" : "#28292b";

  useEffect(() => () => {
    Object.values(settleTimers.current).forEach(clearTimeout);
  }, []);

  const moveWheel = (event: PointerEvent<SVGGElement>, index: number, axis: "x" | "y" = "y", step = wheelStep) => {
    if (disabled) return;
    if (!wheelStart.current || wheelStart.current.index !== index) return;
    const rawDistance = axis === "x" ? event.clientX - wheelStart.current.x : event.clientY - wheelStart.current.y;
    const distance = Math.max(-step, Math.min(step, rawDistance));
    setWheelOffsets((current) => current.map((offset, wheelIndex) => wheelIndex === index ? distance : offset));
  };

  const finishWheel = (event: PointerEvent<SVGGElement>, index: number, axis: "x" | "y" = "y", step = wheelStep) => {
    if (disabled) return;
    if (!wheelStart.current || wheelStart.current.index !== index) return;
    const distance = axis === "x" ? event.clientX - wheelStart.current.x : event.clientY - wheelStart.current.y;
    const direction = Math.abs(distance) < 9 ? 1 : distance < 0 ? 1 : -1;
    setDraggingWheel(null);
    setSettlingWheels((current) => [...current.filter((wheel) => wheel !== index), index]);
    setWheelOffsets((current) => current.map((offset, wheelIndex) => wheelIndex === index ? -direction * step : offset));
    wheelStart.current = null;
    clearTimeout(settleTimers.current[index]);
    settleTimers.current[index] = setTimeout(() => {
      onCycle(index, direction);
      setSettlingWheels((current) => current.filter((wheel) => wheel !== index));
      setWheelOffsets((current) => current.map((offset, wheelIndex) => wheelIndex === index ? 0 : offset));
    }, 180);
  };

  const cancelWheel = (index: number) => {
    wheelStart.current = null;
    setDraggingWheel(null);
    setSettlingWheels((current) => [...current.filter((wheel) => wheel !== index), index]);
    setWheelOffsets((current) => current.map((offset, wheelIndex) => wheelIndex === index ? 0 : offset));
    settleTimers.current[index] = setTimeout(() => setSettlingWheels((current) => current.filter((wheel) => wheel !== index)), 180);
  };

  const wheelValue = (value: string, relativeIndex: number) => {
    const currentIndex = choices.indexOf(value);
    return choices[(currentIndex + relativeIndex + choices.length) % choices.length];
  };

  const finishDirection = (event: PointerEvent<SVGCircleElement>) => {
    if (disabled) return;
    if (!directionStart.current) return;
    const dx = event.clientX - directionStart.current.x;
    const dy = event.clientY - directionStart.current.y;
    directionStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
      onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑"));
      setDirectionSettling(true);
      setDirectionOffset({ x: 0, y: 0 });
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - (bounds.left + bounds.width / 2);
    const clickY = event.clientY - (bounds.top + bounds.height / 2);
    if (Math.hypot(clickX, clickY) < bounds.width * .08) {
      setDirectionSettling(true);
      setDirectionOffset({ x: 0, y: 0 });
      return;
    }
    const direction = Math.abs(clickX) > Math.abs(clickY) ? (clickX > 0 ? "→" : "←") : (clickY > 0 ? "↓" : "↑");
    onDirection(direction);
    const impulse = { x: direction === "→" ? 18 : direction === "←" ? -18 : 0, y: direction === "↓" ? 18 : direction === "↑" ? -18 : 0 };
    setDirectionSettling(false);
    setDirectionOffset(impulse);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setDirectionSettling(true);
      setDirectionOffset({ x: 0, y: 0 });
    }));
  };

  const moveDirection = (event: PointerEvent<SVGCircleElement>) => {
    if (disabled || !directionStart.current) return;
    const rawX = event.clientX - directionStart.current.x;
    const rawY = event.clientY - directionStart.current.y;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > 22 ? 22 / distance : 1;
    setDirectionSettling(false);
    setDirectionOffset({ x: rawX * scale, y: rawY * scale });
  };

  const resetWithRing = () => {
    if (disabled || !isDirection(type)) return;
    setResetPulse((pulse) => pulse + 1);
    onReset();
  };

  return (
    <svg className={`interactive-lock${open ? " is-open" : ""}`} viewBox="0 0 420 390" role="group" aria-label={`${type.replaceAll("-", " ")} lock controls`}>
      <defs>
        <filter id="interactive-shadow"><feDropShadow dx="0" dy="15" stdDeviation="12" floodColor="#4a3027" floodOpacity=".25" /></filter>
        <linearGradient id="interactive-chrome" x1="0" x2="1"><stop stopColor="#777" /><stop offset=".2" stopColor="#f4f4ef" /><stop offset=".5" stopColor="#9b9b97" /><stop offset=".8" stopColor="#efefeb" /><stop offset="1" stopColor="#666" /></linearGradient>
        <linearGradient id="wheel-fade-top" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#111" stopOpacity=".72" /><stop offset="1" stopColor="#111" stopOpacity="0" /></linearGradient>
        <linearGradient id="wheel-fade-bottom" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#111" stopOpacity="0" /><stop offset="1" stopColor="#111" stopOpacity=".72" /></linearGradient>
        <linearGradient id="word-fade-left"><stop stopColor="#08768c" stopOpacity=".78" /><stop offset="1" stopColor="#08768c" stopOpacity="0" /></linearGradient>
        <linearGradient id="word-fade-right"><stop stopColor="#08768c" stopOpacity="0" /><stop offset="1" stopColor="#08768c" stopOpacity=".78" /></linearGradient>
      </defs>
      <g filter="url(#interactive-shadow)">
        <path key={resetPulse} className={`interactive-shackle interactive-shackle--closed${resetPulse ? " is-resetting" : ""}${isDirection(type) && !disabled ? " is-reset-control" : ""}`} role={isDirection(type) ? "button" : undefined} tabIndex={isDirection(type) && !disabled ? 0 : undefined} aria-label={isDirection(type) ? "Reset direction sequence" : undefined} aria-disabled={isDirection(type) ? disabled : undefined} d="M130 165V92c0-88 160-88 160 0v76" fill="none" stroke="url(#interactive-chrome)" strokeWidth="34" strokeLinecap="round" onClick={resetWithRing} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") resetWithRing(); }} />
        <path className="interactive-shackle interactive-shackle--opened" d="M130 165V92c0-88 160-88 160 0v13" fill="none" stroke="url(#interactive-chrome)" strokeWidth="34" strokeLinecap="round" />
        {isDirection(type) ? (
          <g className="interactive-lock-body">
            <path d="M105 168c8-38 37-55 70-55h70c34 0 62 17 70 55l20 80c8 76-42 112-125 112S77 324 85 248Z" fill={bodyColor} stroke="#54352e" strokeWidth="12" />
            <circle cx="210" cy="255" r="86" fill={type === "direction-black" ? "#3c4145" : type === "direction-light-blue" ? "#a3dce5" : "#dc453f"} stroke="#57322d" strokeWidth="9" />
            <path d="m210 177-15 25h30ZM210 333l-15-25h30ZM132 255l25-15v30ZM288 255l-25-15v30Z" fill={type === "direction-black" ? "#eee4d5" : "#3d2926"} />
            <g className={`direction-knob${directionSettling ? " is-settling" : ""}`} style={{ transform: `translate(${directionOffset.x}px, ${directionOffset.y}px)` }}>
              <circle cx="210" cy="255" r="60" fill={type === "direction-light-blue" ? "#c5edf1" : type === "direction-black" ? "#555b60" : "#ef665e"} stroke="#633a33" strokeWidth="7" />
              <circle cx="210" cy="255" r="8" fill="rgba(255,255,255,.3)" />
            </g>
            <circle className="direction-pad direction-hit-area" role="button" aria-label="Tap a direction or swipe" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} cx="210" cy="255" r="86" fill="transparent" onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); directionStart.current = { x: event.clientX, y: event.clientY }; setDirectionSettling(false); }} onPointerMove={moveDirection} onPointerUp={finishDirection} onPointerCancel={() => { directionStart.current = null; setDirectionSettling(true); setDirectionOffset({ x: 0, y: 0 }); }} onKeyDown={(event) => { const direction = { ArrowUp: "↑", ArrowRight: "→", ArrowDown: "↓", ArrowLeft: "←" }[event.key]; if (!disabled && direction) onDirection(direction); }} />
          </g>
        ) : type === "eight-pin" || type === "ten-pin" ? (
          <g className="interactive-lock-body">
            <rect x={type === "ten-pin" ? 95 : 105} y={type === "ten-pin" ? 135 : 145} width={type === "ten-pin" ? 230 : 210} height={type === "ten-pin" ? 240 : 220} rx={type === "ten-pin" ? 29 : 26} fill={bodyColor} stroke="#56514b" strokeWidth="12" />
            {values.map((value, index) => { const column = index % 2; const row = Math.floor(index / 2); const rows = values.length / 2; const pinNumber = row + 1 + column * rows; const x = 170 + column * 90; const y = rows === 5 ? 176 + row * 38 : 183 + row * 48; return <g className="direct-pin" role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-pressed={value === "1"} aria-label={`Pin ${pinNumber}`} onClick={() => { if (!disabled) onToggle(index); }} onKeyDown={(event) => { if (!disabled && (event.key === "Enter" || event.key === " ")) onToggle(index); }} key={index}><text x={x - 36} y={y + 7} fill="#68645e" fontSize="17" fontWeight="800" textAnchor="middle">{pinNumber}</text><rect className="pin-well" x={x - 23} y={y - 10} width="54" height="31" rx="7" fill="#434446" stroke="#38393a" strokeWidth="5" /><g className={`pin-cap${value === "1" ? " is-pressed" : ""}`}><rect x={x - 23} y={y - 15} width="54" height="31" rx="7" fill={value === "1" ? "#56585a" : "#898a88"} stroke="#4e4d49" strokeWidth="5" /><path d={`M${x - 14} ${y - 6}h36`} stroke="#f1eee8" strokeWidth="4" strokeLinecap="round" opacity={value === "1" ? ".28" : ".68"} /></g></g>; })}
            <g className="pin-lock-latch"><rect x="185" y={type === "ten-pin" ? 372 : 362} width="14" height="17" rx="4" fill="#686864" stroke="#4d4945" strokeWidth="4" /><rect x="196" y={type === "ten-pin" ? 377 : 367} width="44" height="16" rx="5" fill="url(#interactive-chrome)" stroke="#56514b" strokeWidth="5" /></g>
          </g>
        ) : type === "vertical-word" ? (
          <g className="interactive-lock-body vertical-word-body">
            <path d="M94 166c8-34 34-49 65-49h102c31 0 57 15 65 49l10 30v123l-18 45H102l-18-45V196Z" fill="#f0eee7" stroke="#5a504a" strokeWidth="12" />
            <path d="M102 174h216" stroke="#d1cec6" strokeWidth="8" strokeLinecap="round" />
            {values.map((value, index) => {
              const rowWidth = 238;
              const rowStep = 72;
              return (
                <g className={`direct-wheel word-ring${draggingWheel === index ? " is-dragging" : ""}`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label={`Letter ring ${index + 1}, ${value}`} key={index} transform={`translate(91 ${195 + index * 39})`} onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); wheelStart.current = { index, x: event.clientX, y: event.clientY }; setDraggingWheel(index); }} onPointerMove={(event) => moveWheel(event, index, "x", rowStep)} onPointerUp={(event) => finishWheel(event, index, "x", rowStep)} onPointerCancel={() => cancelWheel(index)} onKeyDown={(event) => { if (disabled) return; if (event.key === "ArrowLeft") onCycle(index, 1); if (event.key === "ArrowRight") onCycle(index, -1); }}>
                  <rect width={rowWidth} height="42" rx="9" fill="#139bb5" stroke="#287784" strokeWidth="4" />
                  <clipPath id={`word-row-window-${index}`}><rect x="2" y="2" width={rowWidth - 4} height="38" rx="7" /></clipPath>
                  <g clipPath={`url(#word-row-window-${index})`}>
                    <g className={`wheel-strip${settlingWheels.includes(index) ? " is-settling" : ""}`} style={{ transform: `translateX(${wheelOffsets[index] ?? 0}px)` }}>
                      {[-2, -1, 0, 1, 2].map((relativeIndex) => <text className={relativeIndex === 0 ? "word-ring-character is-current" : "word-ring-character"} key={relativeIndex} x={rowWidth / 2 + relativeIndex * rowStep} y="21" dominantBaseline="middle" fill="#fff" fontFamily="ui-monospace, monospace" fontSize="24" fontWeight="800" textAnchor="middle">{wheelValue(value, relativeIndex)}</text>)}
                    </g>
                    <rect className="word-ring-shade word-ring-shade--left" x="2" y="2" width="63" height="38" />
                    <rect className="word-ring-shade word-ring-shade--right" x={rowWidth - 65} y="2" width="63" height="38" />
                  </g>
                  <path d={`M${rowWidth / 2} 1v8M${rowWidth / 2} 33v8`} stroke="#393735" strokeWidth="4" strokeLinecap="round" />
                  <rect width={rowWidth} height="42" fill="transparent"><title>Swipe this ring horizontally</title></rect>
                </g>
              );
            })}
          </g>
        ) : (
          <g className="interactive-lock-body">
            <path d="M52 178 86 143h248l34 35v155l-34 32H86l-34-32Z" fill={bodyColor} stroke="#554139" strokeWidth="12" />
            {values.map((value, index) => (
              <g className={`direct-wheel${draggingWheel === index ? " is-dragging" : ""}`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label={`Wheel ${index + 1}, ${value}`} key={index} transform={`translate(${controlsStart + index * (wheelWidth + wheelGap)} 175)`} onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); wheelStart.current = { index, x: event.clientX, y: event.clientY }; setDraggingWheel(index); }} onPointerMove={(event) => moveWheel(event, index)} onPointerUp={(event) => finishWheel(event, index)} onPointerCancel={() => cancelWheel(index)} onKeyDown={(event) => { if (disabled) return; if (event.key === "ArrowUp") onCycle(index, 1); if (event.key === "ArrowDown") onCycle(index, -1); }}>
                <rect width={wheelWidth} height="145" rx="8" fill={wheelColor} stroke="#4b3b34" strokeWidth="5" />
                <clipPath id={`wheel-window-${index}`}><rect x="3" y="3" width={wheelWidth - 6} height="139" rx="5" /></clipPath>
                <g clipPath={`url(#wheel-window-${index})`}>
                  <g className={`wheel-strip${settlingWheels.includes(index) ? " is-settling" : ""}`} style={{ transform: `translateY(${wheelOffsets[index] ?? 0}px)` }}>
                    {[-2, -1, 0, 1, 2].map((relativeIndex) => <text className={relativeIndex === 0 ? "wheel-character is-current" : "wheel-character"} key={relativeIndex} x={wheelWidth / 2} y={74 + relativeIndex * wheelStep} dominantBaseline="middle" fill="#fff" fontFamily="ui-monospace, monospace" fontSize={wheelCount === 5 ? "28" : "34"} fontWeight="800" textAnchor="middle">{wheelValue(value, relativeIndex)}</text>)}
                  </g>
                  <rect className="wheel-selection" x="3" y="50" width={wheelWidth - 6} height="48" fill="none" />
                  <path d={`M4 50h${wheelWidth - 8}M4 98h${wheelWidth - 8}`} stroke="#aaa49a" strokeWidth="2" />
                  <rect className="wheel-shade wheel-shade--top" x="3" y="3" width={wheelWidth - 6} height="47" />
                  <rect className="wheel-shade wheel-shade--bottom" x="3" y="98" width={wheelWidth - 6} height="44" />
                </g>
                <rect width={wheelWidth} height="145" fill="transparent"><title>Swipe this wheel vertically</title></rect>
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
