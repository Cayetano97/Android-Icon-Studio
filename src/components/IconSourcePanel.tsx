import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IconConfig, IconSource } from "@/types/icon";
import { SUPPORTED_FONTS } from "@/lib/fonts";
import { getIconNames, loadIcon } from "@/lib/lucideIcons";
import { useUiIcons } from "@/lib/uiIcons";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

const COLS = 6;
const ROW_HEIGHT = 50;
const GAP_PX = 6;

function formatIconName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
}

export default function IconSourcePanel({ config, onChange }: Props) {
  const I = useUiIcons();
  const [search, setSearch] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Collapsible icon grid: compact by default (3 rows) so the
  // sidebar fits without scrolling; expandable on demand.
  // Dynamic dvh height to adapt to the viewport (M3 adaptive spacing).
  const [iconsExpanded, setIconsExpanded] = useState(() => {
    try {
      return window.localStorage.getItem("android-icon-studio:icons-expanded") === "1";
    } catch {
      return false;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [iconNames, setIconNames] = useState<string[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsError, setIconsError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const loadIconList = useCallback(async () => {
    setIconsLoading(true);
    setIconsError(false);
    try {
      const names = await getIconNames();
      setIconNames(names);
    } catch {
      setIconsError(true);
      setIconNames([]);
    } finally {
      setIconsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIconList();
  }, [loadIconList, retryToken]);

  const filtered = useMemo(
    () =>
      iconNames.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ),
    [iconNames, search],
  );

  const gridRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: Math.ceil(filtered.length / COLS),
    getScrollElement: () => gridRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Re-measure the grid whenever the clipart tab becomes visible, the icon
  // list finishes loading or the collapsed/expanded state changes, so a
  // stale zero-height measurement can never leave the picker blank.
  useEffect(() => {
    if (config.source !== "clipart" || iconsLoading) return;
    const raf = requestAnimationFrame(() => virtualizer.measure());
    return () => cancelAnimationFrame(raf);
  }, [config.source, iconsLoading, filtered.length, iconsExpanded, virtualizer]);

  function toggleIconsExpanded() {
    setIconsExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          "android-icon-studio:icons-expanded",
          next ? "1" : "0",
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const selectedFont = useMemo(
    () =>
      SUPPORTED_FONTS.find((f) => f.family === config.fontFamily) ||
      SUPPORTED_FONTS[0],
    [config.fontFamily],
  );

  function validateAndLoadFile(file: File) {
    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Use PNG, JPEG, SVG, or WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ imageDataUrl: ev.target?.result as string, source: "image" });
    };
    reader.readAsDataURL(file);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndLoadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndLoadFile(file);
  };

  const handleFontFamilyChange = (family: string) => {
    const font =
      SUPPORTED_FONTS.find((f) => f.family === family) || SUPPORTED_FONTS[0];
    let newWeight = config.fontWeight;
    if (!font.weights.includes(newWeight)) {
      newWeight = font.weights.reduce((prev, curr) =>
        Math.abs(curr - config.fontWeight) <
        Math.abs(prev - config.fontWeight)
          ? curr
          : prev,
      );
    }
    onChange({ fontFamily: family, fontWeight: newWeight });
  };

  return (
    <Tabs
      value={config.source}
      onValueChange={(v) => onChange({ source: v as IconSource })}
      className="w-full"
    >
      <TabsList className="ik-segment w-full! mb-3 bg-transparent shadow-none rounded-full! p-1! gap-1">
        <TabsTrigger
          value="clipart"
          className="flex-1! min-w-0! px-2! text-[11px]! uppercase font-bold tracking-[0.2px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full! shadow-none!"
        >
          Icons
        </TabsTrigger>
        <TabsTrigger
          value="text"
          className="flex-1! min-w-0! px-2! text-[11px]! uppercase font-bold tracking-[0.2px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full! shadow-none!"
        >
          Text
        </TabsTrigger>
        <TabsTrigger
          value="image"
          className="flex-1! min-w-0! px-2! text-[11px]! uppercase font-bold tracking-[0.2px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full! shadow-none!"
        >
          Image
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="clipart"
        className="flex flex-col outline-none mt-0"
      >
        <div className="relative group mb-2.5">
          <Input
            placeholder="Search icons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="relative h-9 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-lg pl-9 pr-14 text-[13px]"
            spellCheck={false}
            autoComplete="off"
            aria-label="Search icons"
          />
          <I.Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
            size={15}
          />
          {!iconsLoading && !iconsError && filtered.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums text-muted-foreground/60 pointer-events-none">
              {filtered.length}
            </span>
          )}
        </div>

        <div
          ref={gridRef}
          data-state={iconsExpanded ? "open" : "closed"}
          className={`overflow-y-auto pr-1 -mr-1 scrollbar-thin transition-[height] duration-200 ease-out ${
            iconsExpanded
              ? "h-[clamp(220px,34dvh,340px)]"
              : "h-[clamp(132px,19dvh,156px)]"
          }`}
        >
          {iconsLoading ? (
            <IconGridSkeleton />
          ) : iconsError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-2xl">⚠️</span>
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                Could not load the icons.
              </p>
              <button
                type="button"
                onClick={() => setRetryToken((t) => t + 1)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
              >
                <I.RefreshCw size={13} />
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-2xl">🔍</span>
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                No icons match “{search}”.
              </p>
            </div>
          ) : (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const startIdx = rowIndex * COLS;
              const rowItems = filtered.slice(startIdx, startIdx + COLS);
              return (
                <div
                  key={virtualRow.key}
                  className="absolute top-0 left-0 w-full grid grid-cols-6"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    gap: `${GAP_PX}px`,
                  }}
                >
                  {rowItems.map((name) => {
                    const Icon = loadIcon(name);
                    if (!Icon) return null;
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => onChange({ clipartName: name })}
                        aria-label={`Select icon ${formatIconName(name)}`}
                        title={formatIconName(name)}
                        className={`rounded-lg flex items-center justify-center transition-all hover:bg-accent/50 hover:scale-[1.06] active:scale-95 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          config.clipartName === name
                            ? "bg-primary shadow-md scale-105"
                            : "bg-background/40 border border-border/50"
                        }`}
                        style={{ height: `${ROW_HEIGHT - GAP_PX}px` }}
                      >
                        <Icon
                          size={20}
                          strokeWidth={config.clipartName === name ? 2.5 : 2}
                          className={
                            config.clipartName === name
                              ? "text-primary-foreground"
                              : "text-muted-foreground/80"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {!iconsLoading && !iconsError && filtered.length > 0 && (
          <button
            type="button"
            onClick={toggleIconsExpanded}
            aria-expanded={iconsExpanded}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary hover:bg-accent/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {iconsExpanded ? (
              <>
                Show less
                <I.ChevronUp size={14} aria-hidden />
              </>
            ) : (
              <>
                Show more · {filtered.length} icons
                <I.ChevronDown size={14} aria-hidden />
              </>
            )}
          </button>
        )}
      </TabsContent>

      <TabsContent value="text" className="space-y-4 outline-none mt-0">
        <div className="space-y-3">
          <span className="ik-section-header mb-0!">Icon Text</span>
          <Input
            value={config.text}
            onChange={(e) => onChange({ text: e.target.value.slice(0, 5) })}
            placeholder="Ab…"
            maxLength={5}
            className="text-3xl font-black text-center h-16 bg-background/40 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
            style={{
              fontFamily: config.fontFamily,
              fontWeight: config.fontWeight,
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-tighter">
              Maximum 5 characters
            </p>
            <span className="text-[10px] font-mono text-primary/70">
              {config.text.length}/5
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="ik-section-header mb-0!">Font</span>
          <div className="grid grid-cols-2 gap-2 max-h-[112px] overflow-y-auto pr-1 scrollbar-thin">
            {SUPPORTED_FONTS.map((font) => (
              <button
                type="button"
                key={font.family}
                onClick={() => handleFontFamilyChange(font.family)}
                className={`p-3 rounded-xl border text-sm transition-all text-left flex flex-col gap-1 ${
                  config.fontFamily === font.family
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background/40 border-border/40 text-muted-foreground hover:bg-accent/40"
                }`}
                style={{ fontFamily: font.family }}
              >
                <span className="font-bold truncate">{font.family}</span>
                <span className="text-[8px] uppercase tracking-widest opacity-50">
                  {font.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted-foreground">
              Font Weight
            </span>
            <span className="text-xs font-bold text-primary">
              {config.fontWeight}
            </span>
          </div>

          {selectedFont.weights.length > 1 ? (
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={selectedFont.weights.length - 1}
                step={1}
                value={selectedFont.weights.indexOf(config.fontWeight)}
                onChange={(e) =>
                  onChange({
                    fontWeight:
                      selectedFont.weights[parseInt(e.target.value)],
                  })
                }
                className="ik-range"
              />
              <div className="flex justify-between px-0.5">
                {selectedFont.weights.map((w) => (
                  <span
                    key={w}
                    className={`text-[8px] font-mono ${config.fontWeight === w ? "text-primary font-bold" : "text-muted-foreground/40"}`}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 bg-background/40 rounded-lg">
              <span className="text-[10px] text-muted-foreground italic">
                Fixed weight for this font
              </span>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="image" className="outline-none mt-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`bg-background/40 border border-border/50 p-5 rounded-2xl flex flex-col items-center justify-center min-h-[176px] gap-5 transition-all hover:bg-accent/20 ${
            isDragOver ? "border-primary border-dashed bg-primary/5" : ""
          }`}
        >
          {config.imageDataUrl ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                <img
                  src={config.imageDataUrl}
                  alt="Preview"
                  className="relative size-32 object-contain rounded-2xl border border-border/40 bg-background/40"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
              >
                <I.RefreshCw size={14} />
                Change image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center gap-4 text-muted-foreground/60 hover:text-primary transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-background/40 border border-border/40 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all">
                <I.Upload
                  size={26}
                  className="group-hover:translate-y-[-2px] transition-transform"
                />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                  Upload image
                </span>
                <span className="text-[9px] opacity-50">
                  SVG, PNG, JPG or WebP (max 4MB)
                </span>
              </div>
            </button>
          )}
          {uploadError && (
            <p className="text-xs text-destructive font-medium mt-2">
              {uploadError}
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function IconGridSkeleton() {
  const rows = 3;
  const cols = 6;
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: `${GAP_PX}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-muted/40 border border-border/40 animate-pulse"
          style={{ height: `${ROW_HEIGHT - GAP_PX}px` }}
        />
      ))}
    </div>
  );
}
