import { useEffect, useRef, useState } from "react";
import type { IconConfig } from "@/types/icon";
import IconSourcePanel from "@/components/IconSourcePanel";
import IconCustomizer from "@/components/IconCustomizer";
import { useUiIcons } from "@/lib/uiIcons";

interface SidebarProps {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  config,
  onChange,
  open,
  onClose,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const I = useUiIcons();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const modal = open && !isDesktop;

  // A drawer left open while the window grows into the desktop layout would
  // stay modal with no visible close affordance; close it on the breakpoint.
  useEffect(() => {
    if (isDesktop && open) onCloseRef.current();
  }, [isDesktop, open]);

  // Move focus into the drawer, then hand it back to the trigger on close.
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebarRef.current?.focus();
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !sidebarRef.current) return;
      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.offsetParent !== null &&
          !element.closest("[inert]") &&
          !element.closest("[hidden]"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 top-14 z-20 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-label="Close settings"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <aside
        id="settings-panel"
        ref={sidebarRef}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        aria-label="Icon settings"
        tabIndex={-1}
        inert={!open && !isDesktop}
        className={`
          fixed inset-y-0 left-0 top-14 z-30 flex w-[min(90vw,380px)] shrink-0 flex-col
          overflow-hidden border-r border-border/70 bg-panel
          shadow-2xl transition-transform duration-200 ease-out
          lg:static lg:top-0 lg:z-0 lg:h-full lg:w-[var(--sidebar-width)] lg:translate-x-0 lg:shadow-none
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5 lg:hidden">
          <span className="font-display text-[13px] font-semibold text-foreground">
            Design settings
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <I.X size={16} aria-hidden />
          </button>
        </div>

        <div className="sidebar-compact settings-column scrollbar-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-6 pt-3 lg:pt-4">
          <IconSourcePanel config={config} onChange={onChange} />
          <div className="h-px shrink-0 bg-border/70" aria-hidden />
          <IconCustomizer config={config} onChange={onChange} />
        </div>
      </aside>
    </>
  );
}
