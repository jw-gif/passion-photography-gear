// Simple shared-password admin gate. Stored client-side only.
// Password is intentionally hardcoded per user request for quick access.
export const ADMIN_PASSWORD = "passion2025";
const KEY = "pg_admin_ok";

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setAdmin(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
}
