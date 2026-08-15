import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import IconWorkspace from "@/components/IconWorkspace";
import { downloadAndroidIcons } from "@/lib/downloadIcon";
import { useTheme } from "@/hooks/use-theme";
import { useUrlState, buildShareUrl } from "@/hooks/use-url-state";

const SIDEBAR_WIDTH_KEY = "android-icon-studio:sidebar-width";
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 560;

function Splitter({ onDrag }: { onDrag: (dx: number) => void }) {
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
    draggingRef.current = false;
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
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return 384;
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return stored >= MIN_SIDEBAR && stored <= MAX_SIDEBAR ? stored : 384;
  });

  const updateConfig = useCallback(
    (updates: Partial<IconConfig>) => {
      setConfig((prev) => {
        const next = { ...prev, ...updates };
        pushToUrl(next);
        return next;
      });
    },
    [pushToUrl],
  );

  const handleCopyLink = useCallback(async () => {
    const url = buildShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Failed to copy URL:", e);
    }
  }, [config]);

  const handleDownload = useCallback(() => {
    void downloadAndroidIcons(config, iconSvgRef.current);
  }, [config]);

  const handleIconSvg = useCallback((svg: string) => {
    iconSvgRef.current = svg;
  }, []);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    pushToUrl(DEFAULT_CONFIG);
    setSidebarOpen(false);
  }, [pushToUrl]);

  const handleSplitterDrag = useCallback((dx: number) => {
    setSidebarWidth((prev) => {
      const next = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, prev + dx));
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "d") {
        e.preventDefault();
        handleDownload();
      } else if (mod && e.key === "s") {
        e.preventDefault();
        handleCopyLink();
      } else if (mod && e.key === "t") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopyLink, toggle, handleDownload]);

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
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onToggleTheme={toggle}
        dark={dark}
        onCopyLink={handleCopyLink}
        onDownload={handleDownload}
        onReset={handleReset}
        copied={copied}
      />

      <div
        className="flex flex-1 min-h-0 relative"
        style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}
      >
        <Sidebar
          config={config}
          onChange={updateConfig}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Splitter onDrag={handleSplitterDrag} />
        <IconWorkspace
          config={config}
          onIconSvg={handleIconSvg}
          appThemeDark={dark}
        />
      </div>
    </div>
    </Suspense>
  );
}
