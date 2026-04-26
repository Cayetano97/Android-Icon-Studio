import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IconConfig, IconSource } from "@/types/icon";
import { SUPPORTED_FONTS } from "@/lib/fonts";
import * as LucideIcons from "lucide-react";

const ALL_ICON_NAMES = Object.keys((LucideIcons as any).icons || LucideIcons)
  .filter((name) => {
    // Only include PascalCase names, exclude those ending with 'Icon' (redundant aliases),
    // and exclude known non-icon exports.
    return (
      /^[A-Z][a-zA-Z0-9]+$/.test(name) &&
      !name.endsWith("Icon") &&
      ![
        "LucideIcon",
        "LucideProps",
        "Lucide",
        "default",
        "createLucideIcon",
      ].includes(name) &&
      // Additional check to ensure it's a component-like thing
      (typeof (LucideIcons as any)[name] === "function" ||
        (typeof (LucideIcons as any)[name] === "object" &&
          (LucideIcons as any)[name]?.render))
    );
  })
  .sort();

const UNIQUE_ICON_NAMES = ALL_ICON_NAMES;

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
}

export default function IconSourcePanel({ config, onChange }: Props) {
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = UNIQUE_ICON_NAMES.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedFont = useMemo(
    () =>
      SUPPORTED_FONTS.find((f) => f.family === config.fontFamily) ||
      SUPPORTED_FONTS[0],
    [config.fontFamily],
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ imageDataUrl: ev.target?.result as string, source: "image" });
    };
    reader.readAsDataURL(file);
  };

  const handleFontFamilyChange = (family: string) => {
    const font =
      SUPPORTED_FONTS.find((f) => f.family === family) || SUPPORTED_FONTS[0];
    // If current weight is not supported by new font, pick closest one
    let newWeight = config.fontWeight;
    if (!font.weights.includes(newWeight)) {
      newWeight = font.weights.reduce((prev, curr) =>
        Math.abs(curr - config.fontWeight) < Math.abs(prev - config.fontWeight)
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
            <LucideIcons.Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              size={16}
            />
          </div>

          <div className="h-[180px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 transition-colors">
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-2 px-2">
              {filtered.map((name) => {
                try {
                  const Icon = (LucideIcons as any)[name];
                  if (!Icon) return null;
                  return (
                    <button
                      key={name}
                      onClick={() => onChange({ clipartName: name })}
                      aria-label={`Select icon ${name}`}
                      className={`aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-accent/50 hover:scale-[1.08] active:scale-95 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        config.clipartName === name
                          ? "bg-primary shadow-[0_0_20px_-5px_hsla(var(--primary),0.4)] ring-0 scale-105"
                          : "bg-card/20 border border-border/40"
                      }`}
                      title={name}
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
                } catch (e) {
                  console.error(`Error rendering icon ${name}:`, e);
                  return null;
                }
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4 outline-none mt-0">
          <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-5 rounded-2xl space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
              Icon Text
            </label>
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
              Font
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {SUPPORTED_FONTS.map((font) => (
                <button
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Font Weight
              </label>
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
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[240px] gap-6 transition-all hover:bg-card/40">
            {config.imageDataUrl ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                  <img
                    src={config.imageDataUrl}
                    alt="Preview"
                    className="relative w-32 h-32 object-contain rounded-2xl border border-border/40 bg-background/40"
                  />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  <LucideIcons.RefreshCw size={14} />
                  Change image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center gap-4 text-muted-foreground/60 hover:text-primary transition-all group"
              >
                <div className="w-16 h-16 rounded-3xl bg-background/40 border border-border/40 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all shadow-xl shadow-black/5">
                  <LucideIcons.Upload
                    size={28}
                    className="group-hover:translate-y-[-2px] transition-transform"
                  />
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                    Upload image
                  </span>
                  <span className="text-[9px] opacity-50">
                    SVG, PNG or JPG supported
                  </span>
                </div>
              </button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
