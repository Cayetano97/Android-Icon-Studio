import { useEffect, useRef } from "react";
import { IconConfig } from "@/types/icon";
import IconSourcePanel from "@/components/IconSourcePanel";
import IconCustomizer from "@/components/IconCustomizer";

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

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !sidebarRef.current) return;
      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static inset-y-0 left-0 z-20 top-[57px] lg:top-0
          border-r border-border/60 bg-background flex flex-col shrink-0 overflow-y-auto
          transition-transform duration-200
          w-[min(85vw,380px)] lg:w-[var(--sidebar-width)]
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex-1 p-4 sm:p-6 pb-12">
          <IconSourcePanel config={config} onChange={onChange} />
          <div className="mt-8">
            <IconCustomizer config={config} onChange={onChange} />
          </div>
        </div>
      </aside>
    </>
  );
}
