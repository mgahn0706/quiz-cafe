const hostPeerIdStorageKey = "quiz-cafe-host-peer-id";
const peerIdPattern = /^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/;

export function isSafePeerId(value: string) {
  return value.length > 0 && value.length <= 128 && peerIdPattern.test(value);
}

export function getOrCreateHostPeerId() {
  try {
    const stored = window.localStorage.getItem(hostPeerIdStorageKey);
    if (stored && isSafePeerId(stored)) return stored;

    const hostPeerId = `problem-room-${window.crypto.randomUUID()}`;
    window.localStorage.setItem(hostPeerIdStorageKey, hostPeerId);
    return hostPeerId;
  } catch {
    return `problem-room-${window.crypto.randomUUID()}`;
  }
}

export function createJoinUrl(hostPeerId: string) {
  const joinUrl = new URL("/", window.location.origin);
  joinUrl.searchParams.set("host", hostPeerId);
  return joinUrl.toString();
}
