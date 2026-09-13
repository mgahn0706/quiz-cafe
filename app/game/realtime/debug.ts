export function realtimeDebug(scope: "host" | "participant", event: string, details?: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  if (details === undefined) console.debug(`[realtime:${scope}] ${event}`);
  else console.debug(`[realtime:${scope}] ${event}`, details);
}
