import {
  memo,
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useDeferredValue,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { IconConfig, IconSource } from "@/types/icon";
import { SUPPORTED_FONTS, ensureFontLoaded } from "@/lib/fonts";
import { getIconNames, loadIcon } from "@/lib/lucideIcons";
import { useUiIcons } from "@/lib/uiIcons";
import { formatIconName } from "@/lib/utils";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

const COLS = 6;
const ROW_HEIGHT = 50;
const GAP_PX = 6;
const numberFormat = new Intl.NumberFormat("en-US");

/**
 * Single virtualized-grid cell. Kept memoized with primitive props plus one
 * stable callback so scrolling/re-selecting does not re-render every visible
 * button or re-resolve its icon component.
 */
const IconGridItem = memo(function IconGridItem({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const Icon = loadIcon(name);
  if (!Icon) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      aria-label={`Select icon ${formatIconName(name)}`}
      aria-pressed={selected}
      title={formatIconName(name)}
      className={`flex items-center justify-center rounded-lg border transition-[background-color,color,transform,box-shadow] duration-150 hover:scale-[1.06] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-panel ${
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-panel text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground"
      }`}
      style={{ height: `${ROW_HEIGHT - GAP_PX}px` }}
    >
      <GridIcon icon={Icon} selected={selected} />
    </button>
  );
});

/**
 * Renders a resolved icon component passed as a prop. Keeping the lookup in
 * `IconGridItem` and the JSX tag here avoids creating components during render
 * (React Compiler `static-components`).
 */
function GridIcon({
  icon: Icon,
  selected,
}: {
  icon: LucideIcon;
  selected: boolean;
}) {
  return (
    <Icon
      size={19}
      strokeWidth={selected ? 2.4 : 1.9}
      aria-hidden
      className={selected ? "text-primary-foreground" : "text-current"}
    />
  );
}

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
}

export default function IconSourcePanel({ config, onChange }: Props) {
  const I = useUiIcons();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Depth counter so dragenter/dragleave fired by child elements do not
  // toggle the dropzone highlight off while the drag is still inside it.
  const dragDepthRef = useRef(0);
  // Collapsible icon grid: compact by default so the settings column stays
  // scannable, expandable when the user is hunting for an icon.
  const [iconsExpanded, setIconsExpanded] = useState(() => {
    try {
      return (
        window.localStorage.getItem("android-icon-studio:icons-expanded") ===
        "1"
      );
    } catch {
      return false;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // The Text tab previews every family in its own face. Load the families on
  // demand (the app shell only ships Inter/Inter Tight) so the cards and the
  // canvas renderer show the real typeface instead of a silent fallback.
  useEffect(() => {
    if (config.source !== "text") return;
    for (const font of SUPPORTED_FONTS) {
      void ensureFontLoaded(font.family);
    }
  }, [config.source]);

  // Lowercased names computed once per icon list; the deferred query filters
  // without blocking typing on large result sets.
  const lowerNames = useMemo(
    () => iconNames.map((name) => name.toLowerCase()),
    [iconNames],
  );

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return iconNames;
    return iconNames.filter((_, i) => lowerNames[i].includes(query));
  }, [iconNames, lowerNames, deferredSearch]);

  const handleSelect = useCallback(
    (name: string) => onChange({ clipartName: name }),
    [onChange],
  );

  const gridRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's instance API is intentionally not memoization-safe; the instance is stable across renders.
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
  }, [
    config.source,
    iconsLoading,
    filtered.length,
    iconsExpanded,
    virtualizer,
  ]);

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
      setUploadError("File too large. Maximum size is 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!isMountedRef.current) return;
      onChange({ imageDataUrl: ev.target?.result as string, source: "image" });
    };
    reader.onerror = () => {
      if (!isMountedRef.current) return;
      setUploadError("Could not read that file. Try another one.");
    };
    reader.readAsDataURL(file);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndLoadFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
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

  const tabTriggerClass =
    "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground data-[state=active]:hover:text-primary-foreground";

  const countLabel = numberFormat.format(filtered.length);

  return (
    <Tabs
      value={config.source}
      onValueChange={(v) => onChange({ source: v as IconSource })}
      className="w-full"
    >
      <TabsList
        aria-label="Icon source"
        className="mb-3.5 grid h-10 w-full grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      >
        <TabsTrigger value="clipart" className={tabTriggerClass}>
          <I.Shapes size={14} aria-hidden />
          Icons
        </TabsTrigger>
        <TabsTrigger value="text" className={tabTriggerClass}>
          <I.Type size={14} aria-hidden />
          Text
        </TabsTrigger>
        <TabsTrigger value="image" className={tabTriggerClass}>
          <I.Image size={14} aria-hidden />
          Image
        </TabsTrigger>
      </TabsList>

      <TabsContent value="clipart" className="mt-0 flex flex-col outline-none">
        <div className="group relative mb-2.5">
          <Input
            placeholder="Search icons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg bg-panel pl-9 pr-12 text-[13px] transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            spellCheck={false}
            autoComplete="off"
            aria-label="Search icons"
          />
          <I.Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
            aria-hidden
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear icon search"
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <I.X size={13} aria-hidden />
            </button>
          ) : (
            !iconsLoading &&
            !iconsError &&
            filtered.length > 0 && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground tabular">
                {countLabel}
              </span>
            )
          )}
        </div>

        <div
          ref={gridRef}
          id="icon-grid"
          role="group"
          aria-label="Icon results"
          data-state={iconsExpanded ? "open" : "closed"}
          className={`scrollbar-thin -mr-1 overflow-y-auto pr-1 transition-[height] duration-200 ease-out ${
            iconsExpanded
              ? "h-[clamp(260px,38dvh,400px)]"
              : "h-[196px]"
          }`}
        >
          {iconsLoading ? (
            <IconGridSkeleton />
          ) : iconsError ? (
            <div
              role="alert"
              className="flex h-full flex-col items-center justify-center gap-3 text-center"
            >
              <p className="max-w-[210px] text-[12px] leading-4 text-muted-foreground">
                Could not load the icon library.
              </p>
              <button
                type="button"
                onClick={() => setRetryToken((t) => t + 1)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                <I.RefreshCw size={13} aria-hidden />
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <I.Search
                size={22}
                aria-hidden
                className="text-muted-foreground/70"
              />
              <p className="max-w-[210px] text-[12px] leading-4 text-muted-foreground">
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
                    className="absolute left-0 top-0 grid w-full grid-cols-6"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gap: `${GAP_PX}px`,
                    }}
                  >
                    {rowItems.map((name) => (
                      <IconGridItem
                        key={name}
                        name={name}
                        selected={config.clipartName === name}
                        onSelect={handleSelect}
                      />
                    ))}
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
            aria-controls="icon-grid"
            className="mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {iconsExpanded ? (
              <>
                Show fewer
                <I.ChevronUp size={12} aria-hidden />
              </>
            ) : (
              <>
                Show all {countLabel} icons
                <I.ChevronDown size={12} aria-hidden />
              </>
            )}
          </button>
        )}
      </TabsContent>

      <TabsContent value="text" className="mt-0 space-y-5 outline-none">
        <div className="space-y-2.5">
          <span className="ik-section-header">Icon text</span>
          <Input
            value={config.text}
            onChange={(e) => onChange({ text: e.target.value.slice(0, 5) })}
            placeholder="Ab…"
            maxLength={5}
            aria-label="Icon text (up to 5 characters)"
            className="h-16 rounded-xl bg-panel text-center text-3xl font-extrabold transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            style={{
              fontFamily: config.fontFamily,
              fontWeight: config.fontWeight,
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Up to 5 characters
            </p>
            <span className="text-[11px] font-medium text-primary tabular">
              {config.text.length}/5
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="ik-section-header">Font</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Font family">
            {SUPPORTED_FONTS.map((font) => (
              <button
                type="button"
                key={font.family}
                onClick={() => handleFontFamilyChange(font.family)}
                aria-pressed={config.fontFamily === font.family}
                className={`flex flex-col gap-1 rounded-lg border p-2.5 text-left text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  config.fontFamily === font.family
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border/60 bg-panel text-foreground hover:bg-accent/40"
                }`}
                style={{ fontFamily: font.family }}
              >
                <span className="truncate font-semibold">{font.family}</span>
                <span className="truncate text-[11px] capitalize text-muted-foreground">
                  {font.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">
              Font weight
            </span>
            <span className="text-[11px] font-semibold text-primary tabular">
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
                    fontWeight: selectedFont.weights[parseInt(e.target.value)],
                  })
                }
                aria-label="Font weight"
                aria-valuetext={`${config.fontWeight}`}
                className="ik-range"
              />
              <div className="flex justify-between px-0.5">
                {selectedFont.weights.map((w) => (
                  <span
                    key={w}
                    className={`text-[11px] tabular ${
                      config.fontWeight === w
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 py-2 text-center">
              <span className="text-[11px] text-muted-foreground">
                Fixed weight for this font
              </span>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="image" className="mt-0 outline-none">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleImageUpload}
          aria-label="Upload image file"
        />
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="group"
          aria-label="Image upload"
          className={`flex min-h-[190px] flex-col items-center justify-center gap-4 rounded-xl border bg-panel p-4 transition-colors ${
            isDragOver
              ? "border-primary bg-primary-soft/50"
              : "border-border/70 hover:border-border"
          }`}
        >
          {config.imageDataUrl ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={config.imageDataUrl}
                alt="Uploaded icon preview"
                className="size-28 rounded-lg border border-border/60 bg-background object-contain p-1"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                <I.RefreshCw size={13} aria-hidden />
                Replace image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex w-full flex-col items-center gap-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-12 place-items-center rounded-xl border border-border/70 bg-background/60 transition-transform group-hover:-translate-y-0.5 group-hover:border-primary/50">
                <I.Upload size={22} aria-hidden />
              </span>
              <span className="text-center">
                <span className="block text-[12px] font-semibold text-foreground">
                  Upload image
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  SVG, PNG, JPEG or WebP · max 4 MB
                </span>
              </span>
            </button>
          )}
          <p
            aria-live="polite"
            className={
              uploadError
                ? "text-center text-[11px] font-medium text-destructive-text"
                : "sr-only"
            }
          >
            {uploadError}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function IconGridSkeleton() {
  const rows = 4;
  const cols = 6;
  return (
    <div
      role="status"
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: `${GAP_PX}px`,
      }}
    >
      <span className="sr-only">Loading icons…</span>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border/40 bg-muted/40"
          style={{ height: `${ROW_HEIGHT - GAP_PX}px` }}
        />
      ))}
    </div>
  );
}
