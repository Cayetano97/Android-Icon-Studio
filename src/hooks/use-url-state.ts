import { useCallback, useEffect, useRef, useState } from "react";
import { IconConfig, DEFAULT_CONFIG } from "@/types/icon";

const STORAGE_KEY = "android-icon-studio:last-config";

type SharedConfig = Omit<IconConfig, "imageDataUrl">;

function toShared(config: IconConfig): SharedConfig {
  const { imageDataUrl: _drop, ...rest } = config;
  return rest;
}

function mergeWithDefaults(shared: Partial<SharedConfig>): IconConfig {
  return {
    ...DEFAULT_CONFIG,
    ...shared,
    imageDataUrl: null,
  };
}

function readUrlConfig(): IconConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const c = params.get("c");
  if (c) {
    try {
      const json = decodeURIComponent(c);
      const parsed = JSON.parse(json) as Partial<SharedConfig>;
      if (!parsed || typeof parsed !== "object") return null;
      const config = mergeWithDefaults(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toShared(config)));
      return config;
    } catch {
      // fall through to localStorage
    }
  }
  // Fallback: read from localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<SharedConfig>;
      if (parsed && typeof parsed === "object") {
        return mergeWithDefaults(parsed);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function writeUrlConfig(config: IconConfig) {
  if (typeof window === "undefined") return;
  const shared = toShared(config);
  const json = JSON.stringify(shared);
  const encoded = encodeURIComponent(json);

  // Also persist to localStorage
  localStorage.setItem(STORAGE_KEY, json);

  const url = new URL(window.location.href);
  if (encoded) {
    url.searchParams.set("c", encoded);
  } else {
    url.searchParams.delete("c");
  }
  const qs = url.searchParams.toString();
  const newPath = qs ? `${url.pathname}?${qs}` : url.pathname;
  window.history.replaceState(null, "", newPath);
}

export function useUrlState() {
  const [initial] = useState<IconConfig | null>(() => readUrlConfig());

  const timerRef = useRef<number | null>(null);
  const push = useCallback((config: IconConfig) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      writeUrlConfig(config);
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return {
    initial,
    push,
  };
}

export function buildShareUrl(config: IconConfig): string {
  if (typeof window === "undefined") return "";
  const shared = toShared(config);
  const json = JSON.stringify(shared);
  const encoded = encodeURIComponent(json);
  const url = new URL(window.location.href);
  if (encoded) {
    url.searchParams.set("c", encoded);
  } else {
    url.searchParams.delete("c");
  }
  const qs = url.searchParams.toString();
  return qs
    ? `${url.origin}${url.pathname}?${qs}`
    : `${url.origin}${url.pathname}`;
}
