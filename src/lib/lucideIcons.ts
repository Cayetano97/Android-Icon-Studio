import { icons, type LucideIcon } from "lucide-react";

export type LucideIconName = keyof typeof icons;

export const ICON_NAMES: LucideIconName[] = (
  Object.keys(icons) as string[]
).filter((name) => {
  return (
    /^[A-Z][a-zA-Z0-9]+$/.test(name) &&
    !name.endsWith("Icon") &&
    ![
      "LucideIcon",
      "LucideProps",
      "Lucide",
      "default",
      "createLucideIcon",
      "icons",
    ].includes(name) &&
    (typeof (icons as Record<string, unknown>)[name] === "function" ||
      (typeof (icons as Record<string, unknown>)[name] === "object" &&
        (icons as Record<string, Record<string, unknown>>)[name]?.render))
  );
}).sort() as LucideIconName[];

/**
 * Safely retrieve a Lucide icon component by name.
 */
export function loadIcon(name: string): LucideIcon | null {
  const icon = (icons as Record<string, LucideIcon>)[name];
  if (!icon) {
    console.warn(`Lucide icon "${name}" not found`);
    return null;
  }
  return icon;
}
