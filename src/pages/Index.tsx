import { useState, useRef, useCallback } from "react";
import { IconConfig, DEFAULT_CONFIG } from "@/types/icon";
import IconSourcePanel from "@/components/IconSourcePanel";
import IconCustomizer from "@/components/IconCustomizer";
import IconPreview from "@/components/IconPreview";
import { downloadAndroidIcons } from "@/lib/downloadIcon";
import { Download, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function Index() {
  const [config, setConfig] = useState<IconConfig>(DEFAULT_CONFIG);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconSvgRef = useRef("");
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const updateConfig = useCallback((updates: Partial<IconConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDownload = () => {
    if (canvasRef.current) {
      downloadAndroidIcons(canvasRef.current, config, iconSvgRef.current);
    }
  };

  const handleIconSvg = useCallback((svg: string) => {
    iconSvgRef.current = svg;
  }, []);

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary/20 overflow-hidden">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent text-foreground"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center justify-center">
            <img
              src="/ic_launcher.svg"
              alt="Android Icon Studio Logo"
              className="size-8 drop-shadow-sm"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Android Icon Studio
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download icons"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download Icons</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSidebarOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
          />
        )}

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
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
                Icon Source
              </h2>
              <IconSourcePanel config={config} onChange={updateConfig} />
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
                  onChange={(e) => updateConfig({ padding: Number(e.target.value) })}
                  className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
                />
              </div>
            </section>

            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 px-1">
                Customization
              </h2>
              <IconCustomizer config={config} onChange={updateConfig} />
            </section>
          </div>
        </aside>

        <main className="flex-1 bg-muted/30 overflow-hidden relative">
          <IconPreview config={config} canvasRef={canvasRef} onIconSvg={handleIconSvg} />
        </main>
      </div>
    </div>
  );
}
