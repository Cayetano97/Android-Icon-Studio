import { useId, useState, type ReactNode } from "react";
import { useUiIcons } from "@/lib/uiIcons";

interface SidebarSectionProps {
  /** Unique key to persist the open/closed state in localStorage. */
  id: string;
  title: string;
  defaultOpen?: boolean;
  /** Extra content to the right of the title (counter, reset…). */
  action?: ReactNode;
  children: ReactNode;
}

const STORAGE_PREFIX = "android-icon-studio:section-";

/**
 * Collapsible sidebar section (disclosure / Radix Collapsible pattern).
 *
 * - Accessible: `aria-expanded` + `aria-controls` + region.
 * - Animated with 0fr/1fr grid-rows (no JS height measuring).
 * - Persists state so the menu always stays as the user left it.
 * References: Radix Collapsible/Accordion + M3 progressive disclosure.
 */
export default function SidebarSection({
  id,
  title,
  defaultOpen = true,
  action,
  children,
}: SidebarSectionProps) {
  const reactId = useId();
  const contentId = `sidebar-section-${id}-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const I = useUiIcons();

  const [open, setOpen] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
      if (stored === "open") return true;
      if (stored === "closed") return false;
    } catch {
      /* localStorage unavailable */
    }
    return defaultOpen;
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + id,
        next ? "open" : "closed",
      );
    } catch {
      /* ignore */
    }
  }

  const Chevron = open ? I.ChevronDown : I.ChevronRight;

  return (
    <section aria-label={title} className="min-w-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="ik-section-header flex-1! mb-0! py-1.5 cursor-pointer select-none text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {title}
            <Chevron size={14} className="shrink-0 opacity-70" aria-hidden />
          </span>
        </button>
        {action}
      </div>
      <div
        id={contentId}
        role="region"
        aria-label={title}
        data-state={open ? "open" : "closed"}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0" inert={!open}>
          <div className="pt-2.5">{children}</div>
        </div>
      </div>
    </section>
  );
}
