import type { Lang } from "./types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeInviteCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export const LANG_LABEL: Record<Lang, string> = { ko: "한국어", zh: "中文" };

export function sessionKey(code: string) {
  return `teambridge:member:${code}`;
}

export function loadMemberId(code: string): string | null {
  try { return localStorage.getItem(sessionKey(code)); } catch { return null; }
}

export function saveMemberId(code: string, id: string) {
  try { localStorage.setItem(sessionKey(code), id); } catch { /* ignore */ }
}

export const AVATAR_COLORS = ["#1f2a5c", "#e8604c", "#21b8a6", "#c99a2e", "#7a5cc9", "#3b82a8"];
export function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
