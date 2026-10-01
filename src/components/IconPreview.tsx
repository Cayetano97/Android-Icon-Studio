import { useRef, useEffect, memo, useState, type ReactNode } from "react";
import type { IconConfig, DarkTheme } from "@/types/icon";
import { buildIconSvgMarkup } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { renderIcon } from "@/lib/iconRenderer";
import {
  HOME_APPS,
  HOME_ROW2_APPS,
  DOCK_APPS,
} from "@/components/realAppsData";
import {
  AppIcon,
  GoogleGLogo,
  MicGlyph,
  LensGlyph,
  PixelWeatherGlyph,
} from "@/components/RealApps";

// Real Pixel 9 Pro: 152.8 x 72mm -> 0.4712 ratio, 20:9, 1280x2856 495PPI.
// 440 x 934 = 0.471 -> exact hardware proportions.
const DEVICE_WIDTH = 440;
const DEVICE_HEIGHT = 934;
const SCREEN = { w: 412, h: 906 };
const ICON_PREVIEW_SIZE = 92;
const LARGE_PREVIEW_SIZE = 256;
const ICON_CARD_SIZE = 176;
const ICON_CARD_PADDING = 32;
const ICON_CARD_LABEL_H = 14;
const ICON_CARD_GAP = 12;
const ICON_CARD_H = ICON_CARD_SIZE + ICON_CARD_GAP + ICON_CARD_LABEL_H;
const ICON_CARD_Y = Math.floor((DEVICE_HEIGHT - ICON_CARD_H) / 2);
const STAGE_GAP = 48;
const STAGE_W = ICON_CARD_SIZE + STAGE_GAP + DEVICE_WIDTH;
const STAGE_H = DEVICE_HEIGHT;

const fz = (px: number) => `${(px / SCREEN.w) * 100}cqw`;

const HOME_ICON_SIZE = 60;
const HOME_GAP_X = 34;
const HOME_GAP_Y = 30;
const GRID_TOP = 198;
const GRID_LEFT = (SCREEN.w - (HOME_ICON_SIZE * 4 + HOME_GAP_X * 3)) / 2;
const USER_SLOT = 2;
const APP_SLOTS = [0, 1, 3];

interface MockupImages {
  main: string;
  themed: string | null;
  large: string;
}

function resolveDarkTheme(darkTheme: DarkTheme, appThemeDark: boolean) {
  if (darkTheme === "dark") return true;
  if (darkTheme === "light") return false;
  return appThemeDark;
}

function useMockupImages(
  config: IconConfig,
  darkTheme: DarkTheme,
  appThemeDark: boolean,
): { images: MockupImages | null; error: boolean } {
  const [images, setImages] = useState<MockupImages | null>(null);
  const [error, setError] = useState(false);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const isDark = resolveDarkTheme(darkTheme, appThemeDark);
    const shape = config.shape;

    async function renderAll() {
      try {
        const current = configRef.current;
        const [main, themed, large] = await Promise.all([
          renderIcon(current, {
            assetSize: { w: ICON_PREVIEW_SIZE, h: ICON_PREVIEW_SIZE },
            shape,
          }),
          current.monochromeEnabled
            ? renderIcon(
                {
                  ...current,
                  background: isDark
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(0,0,0,0.10)",
                  foregroundColor: current.monochromeColor,
                },
                {
                  assetSize: { w: ICON_PREVIEW_SIZE, h: ICON_PREVIEW_SIZE },
                  shape,
                },
              )
            : Promise.resolve(null),
          renderIcon(current, {
            assetSize: { w: LARGE_PREVIEW_SIZE, h: LARGE_PREVIEW_SIZE },
            shape,
          }),
        ]);

        if (cancelled) return;
        setError(false);
        setImages({
          main: main.toDataURL(),
          themed: themed ? themed.toDataURL() : null,
          large: large.toDataURL(),
        });
      } catch (error) {
        console.error("Failed to render mockup preview:", error);
        if (!cancelled) {
          setError(true);
        }
      }
    }

    // Trailing debounce: rapid slider drags coalesce into one render pass.
    const timer = window.setTimeout(renderAll, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    config.clipartName,
    config.source,
    config.text,
    config.fontFamily,
    config.fontWeight,
    config.imageDataUrl,
    config.background,
    config.foregroundColor,
    config.shape,
    config.padding,
    config.foregroundScale,
    config.foregroundOffsetX,
    config.foregroundOffsetY,
    config.foregroundRotation,
    config.monochromeEnabled,
    config.monochromeColor,
    darkTheme,
    appThemeDark,
  ]);

  return { images, error };
}

function ScaledStage({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const compute = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const scale = Math.min(rect.width / width, rect.height / height);
      setLayout({
        scale,
        x: (rect.width - width * scale) / 2,
        y: (rect.height - height * scale) / 2,
      });
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute"
        style={{
          left: layout.x,
          top: layout.y,
          width,
          height,
          transform: `scale(${layout.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pixel System UI — AOSP / Pixel Launcher fidelity
// ---------------------------------------------------------------------------

function PixelStatusBar({ isDark, time }: { isDark: boolean; time: string }) {
  const color = isDark ? "#ffffff" : "#1a1c1e";
  return (
    <div
      className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between select-none"
      style={{
        height: 44,
        paddingLeft: 30,
        paddingRight: 26,
        paddingTop: 6,
        color,
      }}
    >
      <span
        style={{
          fontSize: fz(14),
          fontWeight: 500,
          letterSpacing: 0.2,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'Google Sans','Roboto',system-ui,sans-serif",
          opacity: 0.92,
        }}
      >
        {time}
      </span>
      <div className="flex items-center" style={{ gap: 7 }} aria-hidden="true">
        {/* 5G */}
        <span style={{ fontSize: fz(11), fontWeight: 700, letterSpacing: 0.3 }}>
          5G
        </span>
        {/* Segmented mobile signal, Android 15 style */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="0.9" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.9" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.9" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.9" opacity="0.95" />
        </svg>
        {/* WiFi fan Material */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 9.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM8 6.2c1.8 0 3.4.7 4.6 1.9l-1.5 1.5A4.4 4.4 0 0 0 8 8.4c-1.2 0-2.3.5-3.1 1.2L3.4 8.1A6.4 6.4 0 0 1 8 6.2zM8 2.5c2.8 0 5.3 1.1 7.1 3L13.6 7A8 8 0 0 0 8 4.7c-1.9 0-3.7.7-5 1.9L1.4 5A10 10 0 0 1 8 2.5z"
            fill="currentColor"
          />
        </svg>
        {/* Android 15 battery: % inside, rounded tip */}
        <span className="flex items-center" style={{ gap: 4 }}>
          <span style={{ fontSize: fz(11), fontWeight: 600, opacity: 0.85 }}>
            78
          </span>
          <svg width="25" height="13" viewBox="0 0 25 13" fill="none">
            <rect
              x="0.7"
              y="0.7"
              width="20.6"
              height="11.6"
              rx="3.6"
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeWidth="1.1"
            />
            <rect x="2.4" y="2.4" width="14" height="8.2" rx="2" fill="currentColor" />
            <path
              d="M23.4 4.5v4a2 2 0 0 0 0-4z"
              fill="currentColor"
              fillOpacity="0.5"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

function PixelWallpaper({ isDark }: { isDark: boolean }) {
  // Inspired by the official Pixel collection ("Blooming" / Material You):
  // pastel abstract petals in light mode, plum/teal glows in dark mode.
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: isDark ? "#0b0e14" : "#dfe7ef" }}>
      {isDark ? (
        <>
          <div
            className="absolute"
            style={{
              left: "-22%", top: "-10%", width: "95%", height: "52%",
              background: "radial-gradient(closest-side, rgba(126,87,168,0.85), transparent 72%)",
              filter: "blur(28px)",
            }}
          />
          <div
            className="absolute"
            style={{
              right: "-28%", top: "6%", width: "90%", height: "48%",
              background: "radial-gradient(closest-side, rgba(64,112,132,0.7), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <div
            className="absolute"
            style={{
              left: "4%", top: "30%", width: "92%", height: "46%",
              background: "radial-gradient(closest-side at 30% 40%, rgba(199,120,150,0.5), transparent 65%), radial-gradient(closest-side at 70% 60%, rgba(52,68,140,0.65), transparent 68%)",
              filter: "blur(34px)",
            }}
          />
          <div
            className="absolute"
            style={{
              left: "-20%", bottom: "-18%", width: "140%", height: "52%",
              background: "radial-gradient(closest-side, rgba(18,58,60,0.8), transparent 72%)",
              filter: "blur(30px)",
            }}
          />
          {/* dark petals */}
          <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 412 906" preserveAspectRatio="xMidYMid slice">
            <g opacity="0.55">
              <ellipse cx="320" cy="180" rx="150" ry="90" fill="#2a1e3e" transform="rotate(-18 320 180)" />
              <ellipse cx="90" cy="560" rx="170" ry="110" fill="#122a33" transform="rotate(14 90 560)" />
              <ellipse cx="300" cy="700" rx="160" ry="100" fill="#33222f" transform="rotate(-10 300 700)" />
            </g>
          </svg>
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(168deg,#eef3f8 0%,#dfe9f2 34%,#e8e4f0 62%,#d9e8dc 100%)",
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 412 906" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="px-blur" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="38" />
              </filter>
            </defs>
            <g filter="url(#px-blur)" opacity="0.95">
              <ellipse cx="330" cy="200" rx="150" ry="110" fill="#f7c9d9" />
              <ellipse cx="80" cy="330" rx="130" ry="150" fill="#c3d9f2" />
              <ellipse cx="300" cy="520" rx="170" ry="120" fill="#e6d6ef" />
              <ellipse cx="90" cy="680" rx="150" ry="130" fill="#c8e4cb" />
              <ellipse cx="330" cy="800" rx="140" ry="100" fill="#f2d9c2" />
              <ellipse cx="180" cy="120" rx="110" ry="70" fill="#ffffff" opacity="0.8" />
            </g>
            {/* thin veins like on Pixel wallpapers */}
            <g fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4">
              <path d="M-20 420 C 90 380, 180 460, 432 380" />
              <path d="M-20 640 C 120 600, 240 680, 432 600" opacity="0.7" />
            </g>
          </svg>
        </>
      )}
      {/* subtle grain + vignette */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden="true">
        <filter id="px-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#px-grain)" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 60%, rgba(0,0,0,0.10) 100%)",
        }}
      />
    </div>
  );
}

function AtAGlance({ isDark, dateStr }: { isDark: boolean; dateStr: string }) {
  return (
    <div
      className="absolute left-0 right-0 z-10 select-none"
      style={{ top: 62, paddingLeft: 28, paddingRight: 28 }}
    >
      <div
        style={{
          fontSize: fz(15),
          fontWeight: 500,
          color: isDark ? "#fff" : "#1a1c1e",
          fontFamily: "'Google Sans','Roboto',system-ui,sans-serif",
          letterSpacing: 0.1,
          textShadow: isDark ? "0 1px 8px rgba(0,0,0,0.4)" : "0 1px 6px rgba(255,255,255,0.6)",
        }}
      >
        {dateStr}
      </div>
      <div
        className="flex items-center"
        style={{ marginTop: 6, gap: 8, color: isDark ? "rgba(255,255,255,0.92)" : "rgba(26,28,30,0.85)" }}
      >
        <PixelWeatherGlyph size={24} />
        <span style={{ fontSize: fz(13), fontWeight: 400 }}>
          21°&nbsp;&nbsp;Mostly sunny
        </span>
      </div>
    </div>
  );
}

function PixelSearchBar({ isDark }: { isDark: boolean }) {
  // Official pill: taller since Google app v17.32 (Jun 2026), large Lens/Mic icons.
  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center"
      style={{
        left: 20,
        right: 20,
        bottom: 108,
        height: 56,
        borderRadius: 28,
        paddingLeft: 18,
        paddingRight: 14,
        background: isDark ? "rgba(30,32,38,0.92)" : "rgba(255,255,255,0.96)",
        boxShadow: isDark
          ? "0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)"
          : "0 8px 24px rgba(30,45,60,0.18), inset 0 0 0 1px rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
      }}
    >
      <GoogleGLogo size={22} />
      <span
        style={{
          marginLeft: 14,
          fontSize: 15,
          color: isDark ? "rgba(255,255,255,0.72)" : "#5f6368",
          fontWeight: 400,
        }}
      >
        Search
      </span>
      <span className="ml-auto flex items-center" style={{ gap: 14 }}>
        <MicGlyph size={20} />
        <LensGlyph size={22} />
      </span>
    </div>
  );
}

function HomeLabel({ x, top, label, isDark }: { x: number; top: number; label: string; isDark: boolean }) {
  return (
    <span
      className="absolute z-10 overflow-hidden text-center text-ellipsis whitespace-nowrap"
      style={{
        left: x - 12,
        top,
        width: HOME_ICON_SIZE + 24,
        color: isDark ? "#fff" : "#fff",
        fontSize: fz(11),
        fontWeight: 500,
        lineHeight: 1.25,
        fontFamily: "'Roboto',system-ui,sans-serif",
        textShadow: "0 1px 4px rgba(0,0,0,0.55), 0 0 12px rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </span>
  );
}

function DeviceMockup({
  images,
  isDark,
}: {
  images: MockupImages;
  isDark: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const iconShadow = "0 6px 14px rgba(0,0,0,0.32), 0 1px 3px rgba(0,0,0,0.4)";

  const renderSlot = (
    key: string,
    slot: number,
    rowTop: number,
    node: ReactNode,
    label: string,
  ) => {
    const x = GRID_LEFT + slot * (HOME_ICON_SIZE + HOME_GAP_X);
    return (
      <div key={key}>
        <div
          className="absolute z-10 select-none"
          style={{
            left: x,
            top: rowTop,
            width: HOME_ICON_SIZE,
            height: HOME_ICON_SIZE,
            filter: `drop-shadow(${iconShadow})`,
          }}
        >
          {node}
        </div>
        <HomeLabel x={x} top={rowTop + HOME_ICON_SIZE + 5} label={label} isDark={isDark} />
      </div>
    );
  };

  const userX = GRID_LEFT + USER_SLOT * (HOME_ICON_SIZE + HOME_GAP_X);

  return (
    <div className="ik-device" style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT }}>
      {/* polished-frame antenna lines */}
      <span className="ik-antenna ik-antenna-top" />
      <span className="ik-antenna ik-antenna-bottom" />
      {/* Right-edge buttons like the real Pixel: volume on top, power below */}
      <span className="ik-device-button ik-device-button-volume" />
      <span className="ik-device-button ik-device-button-power" />

      <div className="ik-device-screen" style={{ containerType: "inline-size" }}>
        <PixelWallpaper isDark={isDark} />

        {/* centered front camera with realistic lens */}
        <div className="ik-punchhole" aria-hidden="true">
          <span className="ik-punchhole-lens" />
          <span className="ik-punchhole-glare" />
        </div>

        <PixelStatusBar isDark={isDark} time={time} />
        <AtAGlance isDark={isDark} dateStr={dateStr} />

        {/* 4-column grid */}
        {HOME_APPS.map((app, index) =>
          renderSlot(
            app.id,
            APP_SLOTS[index],
            GRID_TOP,
            <AppIcon app={app} className="h-full w-full" />,
            app.label,
          ),
        )}
        {/* User icon in the center slot */}
        <div>
          <div
            className="absolute z-10 select-none"
            style={{
              left: userX,
              top: GRID_TOP,
              width: HOME_ICON_SIZE,
              height: HOME_ICON_SIZE,
              filter: `drop-shadow(${iconShadow})`,
            }}
          >
            <img
              src={images.themed ?? images.main}
              alt="Your app"
              draggable={false}
              className="h-full w-full rounded-full object-contain"
              style={{ background: "transparent" }}
            />
          </div>
          <HomeLabel x={userX} top={GRID_TOP + HOME_ICON_SIZE + 5} label="Your app" isDark={isDark} />
        </div>

        {HOME_ROW2_APPS.map((app, index) =>
          renderSlot(
            app.id,
            index,
            GRID_TOP + HOME_ICON_SIZE + 22 + HOME_GAP_Y,
            <AppIcon app={app} className="h-full w-full" />,
            app.label,
          ),
        )}

        <PixelSearchBar isDark={isDark} />

        {/* Pixel dock: floating icons without a plate */}
        <div
          className="absolute left-0 right-0 z-10 flex items-center justify-center"
          style={{ bottom: 34, gap: 20 }}
        >
          {DOCK_APPS.map((app) => (
            <div key={app.id} style={{ filter: `drop-shadow(${iconShadow})` }}>
              <AppIcon app={app} style={{ width: 56, height: 56 }} />
            </div>
          ))}
        </div>

        {/* Gesture pill */}
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full"
          style={{
            bottom: 10,
            width: 120,
            height: 4,
            background: isDark ? "rgba(255,255,255,0.9)" : "rgba(20,22,25,0.75)",
          }}
        />
      </div>
    </div>
  );
}

function IconCard({ src }: { src: string }) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: 0, top: ICON_CARD_Y, width: ICON_CARD_SIZE }}
    >
      <div
        className="ik-checkerboard rounded-[2rem] border border-border/70"
        style={{
          width: ICON_CARD_SIZE,
          height: ICON_CARD_SIZE,
          padding: ICON_CARD_PADDING,
          boxShadow:
            "inset 0 1px 2px rgba(0,0,0,.06), 0 6px 16px rgba(15,18,23,.18)",
        }}
      >
        <img
          src={src}
          alt="Icon preview"
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap font-medium text-muted-foreground"
        style={{
          marginTop: ICON_CARD_GAP,
          fontSize: 12,
          lineHeight: `${ICON_CARD_LABEL_H}px`,
        }}
      >
        Your app
      </span>
    </div>
  );
}

function Loading() {
  return <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
}

function IconPreview({ config, onIconSvg, appThemeDark }: {
  config: IconConfig;
  onIconSvg?: (svg: string) => void;
  appThemeDark: boolean;
}) {
  const isDark = resolveDarkTheme(config.darkTheme, appThemeDark);
  const { images, error } = useMockupImages(config, config.darkTheme, appThemeDark);

  useEffect(() => {
    if (config.source !== "clipart") return;
    let cancelled = false;
    (async () => {
      try {
        const svg = await buildIconSvgMarkup(
          config.clipartName,
          cssColorToHex(config.foregroundColor),
        );
        if (!cancelled && svg) onIconSvg?.(svg);
      } catch (error) {
        console.error("Failed to render clipart SVG markup:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.foregroundColor, config.source, config.clipartName, onIconSvg]);

  if (!images) {
    if (error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-5 text-center">
          <span className="text-3xl">⚠</span>
          <p className="max-w-[260px] text-sm text-muted-foreground">
            Could not render the preview. Check the icon or the
            chosen background color.
          </p>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center p-5">
      <ScaledStage width={STAGE_W} height={STAGE_H}>
        <IconCard src={images.large} />
        <div className="absolute" style={{ left: ICON_CARD_SIZE + STAGE_GAP }}>
          <DeviceMockup images={images} isDark={isDark} />
        </div>
      </ScaledStage>
    </div>
  );
}

export default memo(IconPreview);
