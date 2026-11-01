import { useEffect, memo } from "react";
import type { IconConfig, IconShape } from "@/types/icon";
import type { PreviewImages } from "@/hooks/use-icon-images";
import { resolveDarkTheme, usePreviewImages } from "@/hooks/use-icon-images";
import { buildIconSvgMarkup } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { useUiIcons } from "@/lib/uiIcons";
import { Segment } from "@/components/fields";
import { formatIconName } from "@/lib/utils";
import { PhonePreview } from "@/components/IconPreview";

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
  onIconSvg: (svg: string) => void;
  appThemeDark: boolean;
}

const SHAPE_LABELS: Record<IconShape, string> = {
  circle: "Circle",
  square: "Square",
  squircle: "Squircle",
  none: "None",
};

const SOURCE_LABELS = {
  clipart: "Clipart",
  text: "Text",
  image: "Image",
} as const;

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// ---------------------------------------------------------------------------
// Specimen (large icon + real-size ladder)
// ---------------------------------------------------------------------------

function IconSpecimen({
  config,
  images,
}: {
  config: IconConfig;
  images: PreviewImages;
}) {
  const sizes = [48, 72, 96];
  const sourceLabel =
    config.source === "clipart"
      ? formatIconName(config.clipartName)
      : SOURCE_LABELS[config.source];
  return (
    <figure className="board-specimen">
      <div className="specimen-card ik-checkerboard">
        <img
          src={images.large}
          alt="Your app icon at large size"
          width={384}
          height={384}
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>
      <figcaption className="text-center">
        <p className="text-[13px] font-semibold leading-5 text-foreground">
          Your app
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {sourceLabel} · {SHAPE_LABELS[config.shape]}
        </p>
      </figcaption>
      <div className="size-ladder" role="group" aria-label="Preview sizes">
        {sizes.map((size) => (
          <div
            className={`size-step ${size === 96 ? "size-step-96" : ""}`}
            key={size}
          >
            <img
              src={images.large}
              alt=""
              width={size}
              height={size}
              draggable={false}
              style={{ width: size, height: size }}
            />
            <span>{size}px</span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        Real-size previews at 48, 72 and 96 pixels. Source:{" "}
        {SOURCE_LABELS[config.source]}.
      </p>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Loading / error
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="preview-board" aria-busy="true">
      <div className="board-specimen">
        <div className="specimen-card animate-pulse rounded-[30px] bg-muted/50" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted/50" />
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted/40" />
      </div>
      <div className="board-phone">
        <div className="phone-frame animate-pulse rounded-[52px] bg-muted/30" />
      </div>
      <span role="status" className="sr-only">
        Rendering preview…
      </span>
    </div>
  );
}

function BoardError() {
  return (
    <div
      role="alert"
      className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <p className="text-sm font-semibold text-foreground">
        Preview unavailable
      </p>
      <p className="max-w-xs text-xs leading-5 text-muted-foreground">
        We could not render this icon. Check the icon source or the background
        color, then try again.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

function PreviewBoard({
  config,
  onChange,
  onIconSvg,
  appThemeDark,
}: Props) {
  const I = useUiIcons();
  const { images, error, pending } = usePreviewImages(config);
  const isDark = resolveDarkTheme(config.darkTheme, appThemeDark);

  // Keep the export path in sync with the clipart source. The phone preview
  // owns no export logic; the board is the single place that sees both.
  useEffect(() => {
    if (config.source !== "clipart") return;
    let cancelled = false;
    (async () => {
      try {
        const svg = await buildIconSvgMarkup(
          config.clipartName,
          cssColorToHex(config.foregroundColor),
        );
        if (!cancelled && svg) onIconSvg(svg);
      } catch (error) {
        console.error("Failed to render clipart SVG markup:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.foregroundColor, config.source, config.clipartName, onIconSvg]);

  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border/70 bg-background/55 px-4 backdrop-blur-sm sm:px-5">
        <I.Smartphone
          size={15}
          aria-hidden
          className="shrink-0 text-muted-foreground"
        />
        <h2 className="font-display truncate text-[13px] font-semibold text-foreground">
          <span className="sm:hidden">Preview</span>
          <span className="hidden sm:inline">Launcher preview</span>
        </h2>
        <span className="hidden shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-semibold leading-4 text-muted-foreground sm:inline-block">
          Pixel 9 Pro
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            id="preview-theme-label"
            className="hidden text-[11px] font-medium text-muted-foreground md:inline"
          >
            Theme
          </span>
          <Segment
            value={config.darkTheme}
            options={THEME_OPTIONS}
            onChange={(value) =>
              onChange({ darkTheme: value as IconConfig["darkTheme"] })
            }
            label="Preview theme"
          />
        </div>
      </div>

      <div className="board-scroll scrollbar-thin">
        {!images ? (
          error ? (
            <BoardError />
          ) : (
            <BoardSkeleton />
          )
        ) : (
          <div className="preview-board" aria-busy={pending}>
            <IconSpecimen config={config} images={images} />
            <figure className="board-phone">
              <figcaption className="sr-only">
                Home screen preview on a Pixel 9 Pro with a{" "}
                {isDark ? "dark" : "light"} wallpaper. Your icon appears in the
                center of the first row, labelled “Your app”.
              </figcaption>
              <div className="phone-frame">
                <PhonePreview images={images} isDark={isDark} />
              </div>
            </figure>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(PreviewBoard);
