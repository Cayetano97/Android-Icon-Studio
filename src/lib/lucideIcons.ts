import type { LucideIcon } from "lucide-react";

export type LucideIconName = string;

const EXCLUDED_NAMES = new Set([
  "LucideIcon",
  "LucideProps",
  "Lucide",
  "default",
  "createLucideIcon",
  "icons",
]);

let iconMap: Record<string, LucideIcon> | null = null;
let iconMapPromise: Promise<Record<string, LucideIcon>> | null = null;
let iconNamesCache: string[] | null = null;

/**
 * Lazily loads the full Lucide icon map. The heavy lucide-react module is
 * fetched only when the icon picker (or clipart rendering) needs it, keeping
 * it out of the critical initial bundle.
 */
function getIconMap(): Promise<Record<string, LucideIcon>> {
  if (iconMap) return Promise.resolve(iconMap);
  if (!iconMapPromise) {
    iconMapPromise = import("lucide-react")
      .then((mod) => {
        iconMap = mod.icons;
        return mod.icons;
      })
      .catch((err) => {
        // Allow retrying on a later call (e.g. after a network hiccup).
        iconMapPromise = null;
        throw err;
      });
  }
  return iconMapPromise;
}

/** Returns the sorted, filtered list of usable icon names. Cached. */
export async function getIconNames(): Promise<string[]> {
  if (iconNamesCache) return iconNamesCache;
  const map = await getIconMap();
  iconNamesCache = (Object.keys(map) as string[])
    .filter(
      (name) =>
        /^[A-Z][a-zA-Z0-9]+$/.test(name) &&
        !name.endsWith("Icon") &&
        !EXCLUDED_NAMES.has(name) &&
        (typeof map[name] === "function" ||
          (typeof map[name] === "object" && (map[name] as { render?: unknown })?.render)),
    )
    .sort();
  return iconNamesCache;
}

/** Waits until the Lucide module is available. Resolves immediately if already loaded. */
export async function ensureIconsLoaded(): Promise<void> {
  await getIconMap();
}

/**
 * Safely retrieve a Lucide icon component by name.
 * Returns null until the lazy module has been loaded (see ensureIconsLoaded).
 */
export function loadIcon(name: string): LucideIcon | null {
  if (!iconMap) return null;
  const icon = iconMap[name];
  if (!icon) {
    console.warn(`Lucide icon "${name}" not found`);
    return null;
  }
  return icon;
}
