import { useState, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IconConfig, IconSource } from "@/types/icon";
import { SUPPORTED_FONTS } from "@/lib/fonts";
import { ICON_NAMES, loadIcon } from "@/lib/lucideIcons";
import { Search, RefreshCw, Upload } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      ICON_NAMES.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const gridRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: Math.ceil(filtered.length / COLS),
    getScrollElement: () => gridRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

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
    <div className="flex flex-col gap-6">
      <Tabs
        value={config.source}
        onValueChange={(v) => onChange({ source: v as IconSource })}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 mb-3">
          <TabsTrigger
            value="clipart"
            className="text-xs uppercase tracking-tight font-bold"
          >
            Icons
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="text-xs uppercase tracking-tight font-bold"
          >
            Text
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="text-xs uppercase tracking-tight font-bold"
          >
            Image
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="clipart"
          className="flex flex-col outline-none mt-0"
        >
          <div className="relative group mb-3">
            <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Input
              placeholder="Search icons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="relative h-11 bg-card/40 backdrop-blur-md border-border/40 focus:border-primary/40 focus:ring-primary/20 transition-all rounded-2xl pl-11 text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              size={16}
            />
          </div>

          <div
            ref={gridRef}
            className="h-[320px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 transition-colors"
          >
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
                          className={`rounded-xl flex items-center justify-center transition-all hover:bg-accent/50 hover:scale-[1.08] active:scale-95 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            config.clipartName === name
                              ? "bg-primary shadow-[0_0_20px_-5px_hsla(var(--primary),0.4)] ring-0 scale-105"
                              : "bg-card/20 border border-border/40"
                          }`}
                          style={{ height: `${ROW_HEIGHT - GAP_PX}px` }}
                          title={formatIconName(name)}
                        >
                          <Icon
                            size={20}
                            strokeWidth={config.clipartName === name ? 2.5 : 2}
                            className={
                              config.clipartName === name
                                ? "text-primary-foreground"
                                : "text-muted-foreground/70"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4 outline-none mt-0">
          <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-5 rounded-2xl space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
              Icon Text
            </span>
            <Input
              value={config.text}
              onChange={(e) => onChange({ text: e.target.value.slice(0, 5) })}
              placeholder="Ab…"
              maxLength={5}
              className="text-3xl font-black text-center h-20 bg-background/40 backdrop-blur-md border-border/40 focus:border-primary/40 focus:ring-primary/20 rounded-2xl transition-all"
              style={{
                fontFamily: config.fontFamily,
                fontWeight: config.fontWeight,
              }}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-tighter">
                Maximum 5 characters
              </p>
              <span className="text-[10px] font-mono text-primary/60">
                {config.text.length}/5
              </span>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-5 rounded-2xl space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
              Font
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {SUPPORTED_FONTS.map((font) => (
                <button
                  type="button"
                  key={font.family}
                  onClick={() => handleFontFamilyChange(font.family)}
                  className={`p-3 rounded-xl border text-sm transition-all text-left flex flex-col gap-1 ${
                    config.fontFamily === font.family
                      ? "bg-primary/20 border-primary text-primary"
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

          <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Font Weight
              </span>
              <span className="text-xs font-bold text-primary">
                {config.fontWeight}
              </span>
            </div>

            {selectedFont.weights.length > 1 ? (
              <div className="space-y-4">
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
                  className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between px-1">
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
              <div className="text-center py-2 bg-background/20 rounded-lg">
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
            className={`bg-card/30 backdrop-blur-sm border border-border/40 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[240px] gap-6 transition-all hover:bg-card/40 ${
              isDragOver
                ? "border-primary border-dashed bg-primary/5"
                : ""
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
                  <RefreshCw size={14} />
                  Change image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center gap-4 text-muted-foreground/60 hover:text-primary transition-all group"
              >
                <div className="w-16 h-16 rounded-3xl bg-background/40 border border-border/40 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all shadow-xl shadow-black/5">
                  <Upload
                    size={28}
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
    </div>
  );
}
