import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a user-supplied name into a valid Android resource name:
 * lowercase, only [a-z0-9_], must start with a letter.
 */
export function sanitizeResourceName(raw: string): string {
  let name = (raw || "ic_launcher")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(name)) name = `ic_${name}`;
  return name || "ic_launcher";
}

/** Reads from localStorage without throwing in storage-blocked contexts. */
export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes to localStorage without throwing in storage-blocked contexts. */
export function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable/blocked */
  }
}
