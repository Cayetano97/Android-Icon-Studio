import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

function getSystemTheme(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === "dark";
  return getSystemTheme();
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners = [...listeners, callback];

  const onStorage = () => callback();
  window.addEventListener("storage", onStorage);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMqChange = () => callback();
  mq.addEventListener("change", onMqChange);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", onMqChange);
  };
}

function getSnapshot(): boolean {
  return getStoredTheme();
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => true);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    emitChange();
  };

  // Sync on first render
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", dark);
  }

  return { dark, toggle };
}
