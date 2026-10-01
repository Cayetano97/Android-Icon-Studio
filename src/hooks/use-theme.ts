import { useCallback, useEffect, useSyncExternalStore } from "react";
import { safeStorageGet, safeStorageSet } from "@/lib/utils";

const STORAGE_KEY = "theme";

function getSystemTheme(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): boolean {
  if (typeof window === "undefined") return true;
  const stored = safeStorageGet(STORAGE_KEY);
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

  const toggle = useCallback(() => {
    safeStorageSet(STORAGE_KEY, dark ? "light" : "dark");
    emitChange();
  }, [dark]);

  // Apply the theme class outside the render body to keep rendering pure.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return { dark, toggle };
}
