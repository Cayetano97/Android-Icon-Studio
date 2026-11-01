import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { type IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import IconWorkspace from "@/components/IconWorkspace";
import { useTheme } from "@/hooks/use-theme";
import { useUrlState, buildShareUrl } from "@/hooks/use-url-state";
import { buildIconSvgMarkup, ensureIconsLoaded } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { useUiIcons } from "@/lib/uiIcons";
import { safeStorageGet, safeStorageSet } from "@/lib/utils";

const SIDEBAR_WIDTH_KEY = "android-icon-studio:sidebar-width";
const MIN_SIDEBAR = 300;
const MAX_SIDEBAR = 480;
const DEFAULT_SIDEBAR = 368;

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, width));
}

interface SplitterProps {
  value: number;
  min: number;
  max: number;
  onDrag: (dx: number) => void;
  onKeyResize: (next: number) => void;
  onCommit: () => void;
  onReset: () => void;
}

/**
 * Draggable panel separator. Pointer users get the usual drag; keyboard users
 * get arrow / Home / End support and a double-click / Enter reset, so the
 * layout is not gestures-only (WCAG 2.5.7).
 */
function Splitter({
  value,
  min,
  max,
  onDrag,
  onKeyResize,
  onCommit,
  onReset,
}: SplitterProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onDrag(e.clientX - startXRef.current);
    startXRef.current = e.clientX;
  };

  const stopDragging = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.classList.remove("is-resizing");
    onCommit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = value - step;
    else if (e.key === "ArrowRight") next = value + step;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else if (e.key === "Enter") {
      e.preventDefault();
      onReset();
      return;
    }
    if (next === null) return;
    e.preventDefault();
    onKeyResize(clampSidebarWidth(next));
    onCommit();
  };

  /* The ARIA window-splitter pattern is an interactive separator: it owns
   * keyboard resize semantics (aria-valuenow + arrow keys), which jsx-a11y
   * does not model as an interactive role. */
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize settings panel"
      aria-controls="settings-panel"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} pixels`}
      tabIndex={0}
      title="Drag to resize · Arrow keys"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => stopDragging()}
      onPointerCancel={() => stopDragging()}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className="group hidden w-4 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center border-x border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:flex"
    >
      <span
        aria-hidden
        className="flex h-10 w-[3px] flex-col items-center justify-center gap-1 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary"
      >
        <span className="size-0.5 rounded-full bg-muted-foreground/50" />
        <span className="size-0.5 rounded-full bg-muted-foreground/50" />
        <span className="size-0.5 rounded-full bg-muted-foreground/50" />
      </span>
    </div>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}

interface ToastState {
  id: number;
  tone: "info" | "error";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Index() {
  const { initial: initialFromUrl, push: pushToUrl } = useUrlState();
  const [config, setConfig] = useState<IconConfig>(
    () => initialFromUrl ?? DEFAULT_CONFIG,
  );
  const iconSvgRef = useRef("");
  const { dark, toggle } = useTheme();
  const I = useUiIcons();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR;
    const stored = Number(safeStorageGet(SIDEBAR_WIDTH_KEY));
    return stored >= MIN_SIDEBAR && stored <= MAX_SIDEBAR
      ? stored
      : DEFAULT_SIDEBAR;
  });
  const sidebarWidthRef = useRef(sidebarWidth);
  const configRef = useRef(config);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // --- Toast ---------------------------------------------------------------

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (next: Omit<ToastState, "id">) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ ...next, id: Date.now() });
      toastTimerRef.current = window.setTimeout(
        () => {
          toastTimerRef.current = null;
          setToast(null);
        },
        next.tone === "error" ? 9000 : 7000,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // --- Config updates ------------------------------------------------------

  const updateConfig = useCallback((updates: Partial<IconConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Persist config changes to the URL (and storage), skipping the mount run.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    pushToUrl(config);
  }, [config, pushToUrl]);

  // --- Header actions ------------------------------------------------------

  const copyTimerRef = useRef<number | null>(null);

  const handleCopyLink = useCallback(async () => {
    const url = buildShareUrl(configRef.current);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (
        configRef.current.source === "image" &&
        configRef.current.imageDataUrl
      ) {
        showToast({
          tone: "info",
          message: "Link copied. Uploaded images stay on this device.",
        });
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 1800);
    } catch (e) {
      console.error("Failed to copy URL:", e);
      showToast({
        tone: "error",
        message: "Could not copy the link. Copy it from the address bar.",
      });
    }
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      let svg = iconSvgRef.current;
      if (configRef.current.source === "clipart" && !svg) {
        const markup = await buildIconSvgMarkup(
          configRef.current.clipartName,
          cssColorToHex(configRef.current.foregroundColor),
        );
        if (markup) {
          svg = markup;
          iconSvgRef.current = markup;
        }
      }
      const { downloadAndroidIcons } = await import("@/lib/downloadIcon");
      await downloadAndroidIcons(configRef.current, svg || undefined);
    } catch (error) {
      console.error("Export failed:", error);
      showToast({
        tone: "error",
        message: "Export failed. Please try again.",
      });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [showToast]);

  // Warm up the export stack in the background so the first export is instant.
  useEffect(() => {
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const warm = () => {
      void import("@/lib/downloadIcon");
      void ensureIconsLoaded();
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(warm);
    } else {
      timeoutId = window.setTimeout(warm, 2000);
    }
    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  const handleIconSvg = useCallback((svg: string) => {
    iconSvgRef.current = svg;
  }, []);

  const handleReset = useCallback(() => {
    const previous = configRef.current;
    setConfig(DEFAULT_CONFIG);
    setSidebarOpen(false);
    showToast({
      tone: "info",
      message: "Design reset.",
      actionLabel: "Undo",
      onAction: () => setConfig(previous),
    });
  }, [showToast]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // --- Sidebar splitter (rAF-throttled) ------------------------------------

  const dragAccumRef = useRef(0);
  const dragRafRef = useRef<number | null>(null);

  const applyPendingDrag = useCallback(() => {
    dragRafRef.current = null;
    const delta = dragAccumRef.current;
    dragAccumRef.current = 0;
    if (delta === 0) return;
    const next = clampSidebarWidth(sidebarWidthRef.current + delta);
    sidebarWidthRef.current = next;
    setSidebarWidth(next);
  }, []);

  const handleSplitterDrag = useCallback(
    (dx: number) => {
      dragAccumRef.current += dx;
      if (dragRafRef.current === null) {
        dragRafRef.current = window.requestAnimationFrame(applyPendingDrag);
      }
    },
    [applyPendingDrag],
  );

  const handleSplitterCommit = useCallback(() => {
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current);
    }
    applyPendingDrag();
    safeStorageSet(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
  }, [applyPendingDrag]);

  const handleSplitterKeyResize = useCallback((next: number) => {
    const clamped = clampSidebarWidth(next);
    sidebarWidthRef.current = clamped;
    setSidebarWidth(clamped);
  }, []);

  const handleSplitterReset = useCallback(() => {
    sidebarWidthRef.current = DEFAULT_SIDEBAR;
    setSidebarWidth(DEFAULT_SIDEBAR);
    safeStorageSet(SIDEBAR_WIDTH_KEY, String(DEFAULT_SIDEBAR));
  }, []);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
      document.body.classList.remove("is-resizing");
    };
  }, []);

  // --- Keyboard shortcuts --------------------------------------------------

  const shortcutsRef = useRef({ handleDownload });
  useEffect(() => {
    shortcutsRef.current = { handleDownload };
  });
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey) return;
      // Ctrl/Cmd+S is the conventional "save" shortcut. Ctrl/Cmd+D is kept as
      // an alias because the first releases advertised it.
      if (e.key === "s" || e.key === "S" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        void shortcutsRef.current.handleDownload();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-background">
          <div
            className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            role="status"
            aria-label="Loading…"
          />
        </div>
      }
    >
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground selection:bg-primary/20">
        <Header
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
          onToggleTheme={toggle}
          dark={dark}
          onCopyLink={handleCopyLink}
          onDownload={handleDownload}
          onReset={handleReset}
          copied={copied}
          downloading={exporting}
        />

        <div
          className="relative flex min-h-0 flex-1"
          style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}
        >
          <Sidebar
            config={config}
            onChange={updateConfig}
            open={sidebarOpen}
            onClose={handleCloseSidebar}
          />
          <Splitter
            value={sidebarWidth}
            min={MIN_SIDEBAR}
            max={MAX_SIDEBAR}
            onDrag={handleSplitterDrag}
            onKeyResize={handleSplitterKeyResize}
            onCommit={handleSplitterCommit}
            onReset={handleSplitterReset}
          />
          <IconWorkspace
            config={config}
            onChange={updateConfig}
            onIconSvg={handleIconSvg}
            appThemeDark={dark}
          />
        </div>

        {toast && (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-popover-foreground shadow-2xl sm:left-auto sm:right-5 sm:mx-0"
          >
            <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-5">
              {toast.message}
            </span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismissToast();
                }}
                className="shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <I.X size={14} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </Suspense>
  );
}
