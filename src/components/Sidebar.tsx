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
          className="fixed inset-0 bg-foreground/20 z-20 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static inset-y-0 left-0 z-20 top-[57px]
          w-96 max-w-[85vw] border-r border-border bg-card flex flex-col shrink-0 overflow-y-auto
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex-1 p-4 space-y-8">
          <section>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
              Icon Source
            </h2>
            <IconSourcePanel config={config} onChange={onChange} />
          </section>

          <section>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
              Padding Adjustment
            </h2>
            <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="padding-adjustment"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Padding
                </label>
                <span className="text-xs font-bold text-primary">
                  {config.padding}%
                </span>
              </div>
              <input
                id="padding-adjustment"
                type="range"
                min={5}
                max={45}
                value={config.padding}
                onChange={(e) =>
                  onChange({ padding: Number(e.target.value) })
                }
                className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
              />
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
              Customization
            </h2>
            <IconCustomizer config={config} onChange={onChange} />
          </section>
        </div>
      </aside>
    </>
  );
}
