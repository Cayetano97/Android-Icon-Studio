import { useState, useRef, useCallback, useEffect } from "react";
import { IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import IconWorkspace from "@/components/IconWorkspace";
import { downloadAndroidIcons } from "@/lib/downloadIcon";
import { useTheme } from "@/hooks/use-theme";
import { useUrlState, buildShareUrl } from "@/hooks/use-url-state";

export default function Index() {
  const { initial: initialFromUrl, push: pushToUrl } = useUrlState();
  const [config, setConfig] = useState<IconConfig>(
    () => initialFromUrl ?? DEFAULT_CONFIG,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconSvgRef = useRef("");
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(config);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Android Icon Studio", url });
        return;
      }
    } catch {
      // user dismissed or unsupported — fall back to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Failed to copy URL:", e);
    }
  }, [config]);

  const handleDownload = useCallback(() => {
    if (canvasRef.current) {
      downloadAndroidIcons(canvasRef.current, config, iconSvgRef.current);
    }
  }, [config]);

  const handleIconSvg = useCallback((svg: string) => {
    iconSvgRef.current = svg;
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
        handleShare();
      } else if (mod && e.key === "t") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShare, toggle, handleDownload]);

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary/20 overflow-hidden">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onToggleTheme={toggle}
        dark={dark}
        onShare={handleShare}
        onDownload={handleDownload}
        copied={copied}
      />

      <div className="flex flex-1 min-h-0 relative">
        <Sidebar
          config={config}
          onChange={updateConfig}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <IconWorkspace
          config={config}
          canvasRef={canvasRef}
          onIconSvg={handleIconSvg}
        />
      </div>
    </div>
  );
}
