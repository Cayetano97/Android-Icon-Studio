import { useCallback, useEffect, useRef, useState } from "react";
import { type IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import { safeStorageGet, safeStorageSet } from "@/lib/utils";

const STORAGE_KEY = "android-icon-studio:last-config";

type SharedConfig = Omit<IconConfig, "imageDataUrl">;

const SOURCES = ["clipart", "text", "image"] as const;
const SHAPES = ["circle", "square", "squircle", "none"] as const;
const THEMES = ["auto", "dark", "light"] as const;

function toShared(config: IconConfig): SharedConfig {
  const { imageDataUrl: _drop, ...rest } = config;
  return rest;
}

/** Clamps a numeric field, falling back when the value is not a finite number. */
function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Accepts any string (empty included) and falls back otherwise. */
function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

/** Accepts only non-empty strings; used for fields where empty means broken. */
function nonEmptyStr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/** Accepts only allowlisted enum values; anything else falls back. */
function oneOf<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

/**
 * Merges untrusted input (crafted `?c=` payloads or corrupted storage) with
 * the defaults, clamping geometry and rejecting unknown enum/string values.
 */
function mergeWithDefaults(shared: Partial<SharedConfig>): IconConfig {
  const d = DEFAULT_CONFIG;
  return {
    source: oneOf(shared.source, SOURCES, d.source),
    clipartName: str(shared.clipartName, d.clipartName),
    text: str(shared.text, d.text),
    fontFamily: nonEmptyStr(shared.fontFamily, d.fontFamily),
    fontWeight: num(shared.fontWeight, 100, 900, d.fontWeight),
    imageDataUrl: null,
    foregroundColor: nonEmptyStr(shared.foregroundColor, d.foregroundColor),
    background: nonEmptyStr(shared.background, d.background),
    shape: oneOf(shared.shape, SHAPES, d.shape),
    padding: num(shared.padding, 0, 45, d.padding),
    foregroundScale: num(shared.foregroundScale, 0.1, 3, d.foregroundScale),
    foregroundOffsetX: num(
      shared.foregroundOffsetX,
      -100,
      100,
      d.foregroundOffsetX,
    ),
    foregroundOffsetY: num(
      shared.foregroundOffsetY,
      -100,
      100,
      d.foregroundOffsetY,
    ),
    foregroundRotation: num(
      shared.foregroundRotation,
      0,
      360,
      d.foregroundRotation,
    ),
    monochromeEnabled:
      typeof shared.monochromeEnabled === "boolean"
        ? shared.monochromeEnabled
        : d.monochromeEnabled,
    monochromeColor: nonEmptyStr(shared.monochromeColor, d.monochromeColor),
    filename: str(shared.filename, d.filename),
    darkTheme: oneOf(shared.darkTheme, THEMES, d.darkTheme),
  };
}

// Compact base64url encoding (no padding, URL-safe)
function encodeConfig(shared: Partial<SharedConfig>): string {
  const json = JSON.stringify(shared);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  const CHUNK_SIZE = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeConfig(encoded: string): Partial<SharedConfig> | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    const padded = padding ? base64 + "=".repeat(4 - padding) : base64;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<SharedConfig>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readUrlConfig(): IconConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const c = params.get("c");
  if (c) {
    // Try compact base64url format first
    const parsed = decodeConfig(c);
    if (parsed) {
      return mergeWithDefaults(parsed);
    }
    // Fallback: legacy percent-encoded JSON
    try {
      const json = decodeURIComponent(c);
      const legacy = JSON.parse(json) as Partial<SharedConfig>;
      if (!legacy || typeof legacy !== "object") return null;
      return mergeWithDefaults(legacy);
    } catch {
      // fall through to localStorage
    }
  }
  // Fallback: read from localStorage
  const stored = safeStorageGet(STORAGE_KEY);
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

function persistLocal(config: IconConfig): void {
  safeStorageSet(STORAGE_KEY, JSON.stringify(toShared(config)));
}

function writeUrlConfig(config: IconConfig) {
  if (typeof window === "undefined") return;
  const shared = toShared(config);
  const encoded = encodeConfig(shared);

  persistLocal(config);

  const url = new URL(window.location.href);
  if (encoded) {
    url.searchParams.set("c", encoded);
  } else {
    url.searchParams.delete("c");
  }
  const qs = url.searchParams.toString();
  const newPath = qs ? `${url.pathname}?${qs}` : url.pathname;
  try {
    window.history.replaceState(null, "", newPath);
  } catch {
    // Sandboxed iframes can reject history mutations.
  }
}

export function useUrlState() {
  const [initial] = useState<IconConfig | null>(() => readUrlConfig());

  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<IconConfig | null>(null);

  const push = useCallback((config: IconConfig) => {
    pendingRef.current = config;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) writeUrlConfig(pending);
    }, 250);
  }, []);

  // Persist a config recovered from the URL once on mount.
  useEffect(() => {
    if (initial) persistLocal(initial);
  }, [initial]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Flush the newest pending config when the page starts unloading.
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (!pending) return;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = null;
      writeUrlConfig(pending);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  return {
    initial,
    push,
  };
}

export function buildShareUrl(config: IconConfig): string {
  if (typeof window === "undefined") return "";
  const shared = toShared(config);
  const encoded = encodeConfig(shared);
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
