"use client";

import { useEffect, useState } from "react";

export function calculateElapsedSeconds(startedAt: number | null, stoppedAt: number | null, now = Date.now()) {
  if (startedAt === null) return 0;
  return Math.max(0, Math.floor(((stoppedAt ?? now) - startedAt) / 1000));
}

export function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function useElapsedSeconds(startedAt: number | null, stoppedAt: number | null) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => calculateElapsedSeconds(startedAt, stoppedAt));

  useEffect(() => {
    const update = () => setElapsedSeconds(calculateElapsedSeconds(startedAt, stoppedAt));
    const frame = window.requestAnimationFrame(update);
    if (startedAt === null || stoppedAt !== null) return () => window.cancelAnimationFrame(frame);

    const timer = window.setInterval(update, 250);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [startedAt, stoppedAt]);

  return elapsedSeconds;
}
