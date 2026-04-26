import { useState, useRef, useCallback } from "react";
import { IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import IconSourcePanel from "@/components/IconSourcePanel";
import IconCustomizer from "@/components/IconCustomizer";
import IconPreview from "@/components/IconPreview";
import { downloadAndroidIcons } from "@/lib/downloadIcon";
import { Download, Smartphone, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function Index() {
  const [config, setConfig] = useState<IconConfig>(DEFAULT_CONFIG);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const updateConfig = useCallback((updates: Partial<IconConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDownload = () => {
    if (canvasRef.current) {
      downloadAndroidIcons(canvasRef.current, config);
    }
  };

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary/20 overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent text-foreground"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center justify-center">
            <img
              src="/ic_launcher.svg"
              alt="Android Icon Studio Logo"
              className="w-8 h-8 drop-shadow-sm"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Android Icon Studio
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={handleDownload}
            aria-label="Download icons"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download Icons</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left panel */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-20 top-[57px]
            w-96 max-w-[85vw] border-r border-border bg-card flex flex-col shrink-0 overflow-y-auto
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex-1 p-4 space-y-8">
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
                Icon Source
              </h2>
              <IconSourcePanel config={config} onChange={updateConfig} />
            </section>

            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
                Customization
              </h2>
              <IconCustomizer config={config} onChange={updateConfig} />
            </section>
          </div>
        </aside>

        {/* Preview area */}
        <main className="flex-1 bg-muted/30 overflow-hidden relative">
          <IconPreview config={config} canvasRef={canvasRef} />
        </main>
      </div>
    </div>
  );
}
