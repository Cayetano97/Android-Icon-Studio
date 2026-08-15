import { use } from "react";
import type { LucideIcon } from "lucide-react";

const UI_ICON_NAMES = [
  "Check",
  "ChevronDown",
  "ChevronRight",
  "Download",
  "Link2",
  "Menu",
  "Mic",
  "Moon",
  "RefreshCw",
  "RotateCcw",
  "Search",
  "Sun",
  "Trash2",
  "Upload",
  "X",
] as const;

export type UiIconName = (typeof UI_ICON_NAMES)[number];

/**
 * Shared lazy reference to the lucide-react module. Components that render UI
 * icons suspend on this promise, so the whole lucide bundle is fetched in a
 * single background chunk instead of blocking the initial page load.
 */
const uiIconsPromise: Promise<Record<UiIconName, LucideIcon>> = import(
  "lucide-react"
).then((mod) => {
  const all = mod as Record<string, unknown>;
  return Object.fromEntries(
    UI_ICON_NAMES.map((name) => [name, all[name]]),
  ) as Record<UiIconName, LucideIcon>;
});

/** Returns the UI icons, suspending until the lazy chunk has loaded. */
export function useUiIcons(): Record<UiIconName, LucideIcon> {
  return use(uiIconsPromise);
}
