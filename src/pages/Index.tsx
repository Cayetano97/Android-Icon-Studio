import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { type IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import IconWorkspace from "@/components/IconWorkspace";
import { useTheme } from "@/hooks/use-theme";
import { useUrlState, buildShareUrl } from "@/hooks/use-url-state";
import { buildIconSvgMarkup, ensureIconsLoaded } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { safeStorageGet, safeStorageSet } from "@/lib/utils";

const SIDEBAR_WIDTH_KEY = "android-icon-studio:sidebar-width";
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 560;

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, width));
}

function Splitter({
  onDrag,
  onDragEnd,
}: {
  onDrag: (dx: number) => void;
  onDragEnd?: () => void;
}) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    onDrag(e.clientX - startXRef.current);
    startXRef.current = e.clientX;
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onDragEnd?.();
  };

  return (
    <div
      className="hidden lg:block w-[12px] shrink-0 cursor-ew-resize hover:bg-accent/60 active:bg-accent transition-colors"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
    >
      <div className="h-full w-full flex items-center justify-center opacity-40">
        <svg width="4" height="28" viewBox="0 0 4 28" fill="none">
          <circle cx="2" cy="3" r="1" fill="currentColor" />
          <circle cx="2" cy="14" r="1" fill="currentColor" />
          <circle cx="2" cy="25" r="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export default function Index() {
  const { initial: initialFromUrl, push: pushToUrl } = useUrlState();
  const [config, setConfig] = useState<IconConfig>(
    () => initialFromUrl ?? DEFAULT_CONFIG,
  );
  const iconSvgRef = useRef("");
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return 384;
    const stored = Number(safeStorageGet(SIDEBAR_WIDTH_KEY));
    return stored >= MIN_SIDEBAR && stored <= MAX_SIDEBAR ? stored : 384;
  });
  const sidebarWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // --- Config updates -------------------------------------------------------

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

  // --- Header actions -------------------------------------------------------

  const copyTimerRef = useRef<number | null>(null);

  const handleCopyLink = useCallback(async () => {
    const url = buildShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 1800);
    } catch (e) {
      console.error("Failed to copy URL:", e);
    }
  }, [config]);

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
    setExportError(null);
    try {
      let svg = iconSvgRef.current;
      if (config.source === "clipart" && !svg) {
        const markup = await buildIconSvgMarkup(
          config.clipartName,
          cssColorToHex(config.foregroundColor),
        );
        if (markup) {
          svg = markup;
          iconSvgRef.current = markup;
        }
      }
      const { downloadAndroidIcons } = await import("@/lib/downloadIcon");
      await downloadAndroidIcons(config, svg || undefined);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError("Export failed. Please try again.");
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [config]);

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
    setConfig(DEFAULT_CONFIG);
    setSidebarOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // --- Sidebar splitter (rAF-throttled) -------------------------------------

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

  const handleSplitterDragEnd = useCallback(() => {
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current);
    }
    applyPendingDrag();
    safeStorageSet(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
  }, [applyPendingDrag]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    };
  }, []);

  // --- Keyboard shortcuts ---------------------------------------------------

  const shortcutsRef = useRef({ handleDownload, handleCopyLink, toggle });
  useEffect(() => {
    shortcutsRef.current = { handleDownload, handleCopyLink, toggle };
  });
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const {
        handleDownload,
        handleCopyLink,
        toggle,
      } = shortcutsRef.current;
      if (mod && e.key === "d") {
        e.preventDefault();
        void handleDownload();
      } else if (mod && e.key === "s") {
        e.preventDefault();
        void handleCopyLink();
      } else if (mod && e.key === "t") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-full bg-background flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
    <div className="h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary/20 overflow-hidden">
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
        className="flex flex-1 min-h-0 relative"
        style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}
      >
        <Sidebar
          config={config}
          onChange={updateConfig}
          open={sidebarOpen}
          onClose={handleCloseSidebar}
        />
        <Splitter onDrag={handleSplitterDrag} onDragEnd={handleSplitterDragEnd} />
        <IconWorkspace
          config={config}
          onIconSvg={handleIconSvg}
          appThemeDark={dark}
        />
      </div>

      {exportError && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg"
        >
          {exportError}
        </div>
      )}
    </div>
    </Suspense>
  );
}
