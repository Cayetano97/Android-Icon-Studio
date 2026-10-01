import type { LucideIcon } from "lucide-react";
// Per-icon modules from the package dist: importing the barrel here would make
// the dynamic import in `@/lib/lucideIcons` ineffective (rolldown keeps a
// statically imported module in the entry chunk), pulling the whole ~750 KB
// icon set into the initial bundle. These 16 default imports stay tiny.
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.mjs";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import Link2 from "lucide-react/dist/esm/icons/link-2.mjs";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import Mic from "lucide-react/dist/esm/icons/mic.mjs";
import Moon from "lucide-react/dist/esm/icons/moon.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import Sun from "lucide-react/dist/esm/icons/sun.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";

export const UI_ICON_NAMES = [
  "Check",
  "ChevronDown",
  "ChevronRight",
  "ChevronUp",
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
 * Static map of the shared UI chrome icons. These are per-icon module imports,
 * so the UI shell never suspends and the whole icon set stays lazy: the picker
 * and clipart rendering load it through `@/lib/lucideIcons`.
 */
const uiIcons: Record<UiIconName, LucideIcon> = {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Link2,
  Menu,
  Mic,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Sun,
  Trash2,
  Upload,
  X,
};

/** Returns the shared UI chrome icons. Never suspends. */
export function useUiIcons(): Record<UiIconName, LucideIcon> {
  return uiIcons;
}
