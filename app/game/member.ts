import type { MemberIdentity } from "./session";

const memberStorageKey = "quiz-cafe-member";
const memberIdPattern = /^member-[A-Za-z0-9-]{16,80}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const nicknameMaxLength = 24;

export function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, nicknameMaxLength);
}

export function isMemberIdentity(value: unknown): value is MemberIdentity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && memberIdPattern.test(candidate.id)
    && typeof candidate.nickname === "string"
    && candidate.nickname === normalizeNickname(candidate.nickname)
    && candidate.nickname.length > 0
    && !controlCharacterPattern.test(candidate.nickname);
}

export function loadMemberIdentity() {
  if (typeof window === "undefined") return null;

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(memberStorageKey) ?? "null");
    return isMemberIdentity(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveMemberIdentity(nickname: string, currentMember?: MemberIdentity | null) {
  if (typeof window === "undefined") return null;
  const normalizedNickname = normalizeNickname(nickname);
  if (!normalizedNickname || controlCharacterPattern.test(normalizedNickname)) return null;

  const member: MemberIdentity = {
    id: currentMember?.id ?? `member-${window.crypto.randomUUID()}`,
    nickname: normalizedNickname,
  };

  try {
    window.localStorage.setItem(memberStorageKey, JSON.stringify(member));
  } catch {
    // The in-memory identity still works for this page lifecycle.
  }
  return member;
}
