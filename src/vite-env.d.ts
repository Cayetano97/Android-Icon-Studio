/// <reference types="vite/client" />

interface WindowEventMap {
  "vite:preloadError": Event;
}

// The lucide-react dist ships no per-icon type declarations; UI chrome icons
// are imported from the per-icon modules (see src/lib/uiIcons.ts).
declare module "lucide-react/dist/esm/icons/*.mjs" {
  import type { LucideIcon } from "lucide-react";
  const Icon: LucideIcon;
  export default Icon;
}
