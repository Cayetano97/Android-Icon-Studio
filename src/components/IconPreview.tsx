import { useRef, useEffect, memo, useState, type ReactNode } from "react";
import { IconConfig, DarkTheme } from "@/types/icon";
import { renderToStaticMarkup } from "react-dom/server";
import { loadIcon, ensureIconsLoaded } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { renderIcon } from "@/lib/iconRenderer";
import { AppIcon, HOME_APPS, HOME_ROW2_APPS, DOCK_APPS, GoogleGLogo, MicGlyph } from "@/components/RealApps";

interface Props {
  config: IconConfig;
  onIconSvg?: (svg: string) => void;
  appThemeDark: boolean;
}

// Fixed design coordinates are scaled as one unit so the device keeps its
// proportions instead of stretching independently with the preview panel.
const DEVICE_WIDTH = 440;
const DEVICE_HEIGHT = 920;
const SCREEN = { w: 424, h: 904 };
const ICON_PREVIEW_SIZE = 92;
const LARGE_PREVIEW_SIZE = 256;
// The icon detail card and the phone share one composition stage so they
// scale together. Tile padding (32/176 ≈ 18%) mirrors Material 3's
// adaptive-icon safe zone (66dp inside a 108dp canvas).
const ICON_CARD_SIZE = 176;
const ICON_CARD_PADDING = 32;
const ICON_CARD_LABEL_H = 14;
const ICON_CARD_GAP = 12;
const ICON_CARD_H = ICON_CARD_SIZE + ICON_CARD_GAP + ICON_CARD_LABEL_H;
const ICON_CARD_Y = Math.floor((DEVICE_HEIGHT - ICON_CARD_H) / 2);
const STAGE_GAP = 48;
const STAGE_W = ICON_CARD_SIZE + STAGE_GAP + DEVICE_WIDTH;
const STAGE_H = DEVICE_HEIGHT;

const cy = (y: number) => `${(y / SCREEN.h) * 100}%`;
const fz = (px: number) => `${(px / SCREEN.w) * 100}cqw`;

const HOME_ICON_SIZE = 52;
const HOME_GAP = 35;
const HOME_ROW_TOP = 420;
const HOME_ROW2_TOP = 300;
const HOME_LABEL_TOP = 60;
const HOME_START_X = (SCREEN.w - (HOME_ICON_SIZE * 4 + HOME_GAP * 3)) / 2;
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
                  foregroundColor: isDark ? "#ffffff" : "#3c4043",
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

    renderAll();
    return () => {
      cancelled = true;
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

function StatusBar({ isDark, time }: { isDark: boolean; time: string }) {
  const color = isDark ? "text-white/90" : "text-[#17191c]/75";

  return (
    <div
      className={`absolute left-[5.5%] right-[5%] top-[2.2%] z-10 flex items-center justify-between select-none ${color}`}
    >
      <span className="text-[12px] font-semibold tabular-nums tracking-wide" style={{ fontSize: fz(12) }}>
        {time}
      </span>
      <div className="flex items-center gap-[7px]" aria-hidden="true">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
          <rect x="0" y="6.5" width="2.5" height="3.5" rx="0.5" />
          <rect x="3.8" y="4.5" width="2.5" height="5.5" rx="0.5" />
          <rect x="7.6" y="2.2" width="2.5" height="7.8" rx="0.5" />
          <rect x="11.4" width="2.5" height="10" rx="0.5" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M1.5 3.8a8 8 0 0 1 11 0" />
          <path d="M4 6.2a4.7 4.7 0 0 1 6 0" />
          <circle cx="7" cy="8.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="19" height="10" viewBox="0 0 19 10" fill="none">
          <rect x="0.5" y="0.5" width="15.5" height="9" rx="2.8" stroke="currentColor" opacity="0.45" />
          <rect x="2" y="2" width="11" height="7" rx="1.8" fill="currentColor" />
          <rect x="17" y="3.2" width="1.5" height="3.6" rx="0.75" fill="currentColor" opacity="0.45" />
        </svg>
      </div>
    </div>
  );
}

function Wallpaper({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: isDark
          ? "radial-gradient(circle at 84% 12%, rgba(93, 74, 143, .56), transparent 34%), radial-gradient(circle at 12% 76%, rgba(24, 102, 112, .48), transparent 40%), linear-gradient(155deg, #111827 0%, #24243c 56%, #102b35 100%)"
          : "radial-gradient(circle at 88% 14%, rgba(255, 255, 255, .82), transparent 32%), radial-gradient(circle at 12% 78%, rgba(174, 220, 231, .8), transparent 42%), linear-gradient(155deg, #c7e3ee 0%, #e8dff0 55%, #d9eadb 100%)",
      }}
    />
  );
}

function SearchBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="absolute left-[5.5%] right-[5.5%] top-[11.5%] z-10 flex items-center rounded-full px-[4%] backdrop-blur-md"
      style={{
        height: cy(38),
        background: isDark ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.72)",
        boxShadow: isDark
          ? "inset 0 0 0 1px rgba(255,255,255,.16)"
          : "0 5px 18px rgba(49,69,84,.12), inset 0 0 0 1px rgba(255,255,255,.7)",
      }}
    >
      <GoogleGLogo size={15} />
      <span className="ml-[3%]" style={{ fontSize: fz(11), color: isDark ? "rgba(255,255,255,.64)" : "#69747d" }}>
        Search
      </span>
      <span className="ml-auto flex" style={{ color: isDark ? "rgba(255,255,255,.7)" : "#69747d" }}>
        <MicGlyph size={14} />
      </span>
    </div>
  );
}

function HomeApp({
  app,
  slot,
  isDark,
  top = HOME_ROW_TOP,
}: {
  app: (typeof HOME_APPS)[number];
  slot: number;
  isDark: boolean;
  top?: number;
}) {
  const x = HOME_START_X + slot * (HOME_ICON_SIZE + HOME_GAP);
  const labelColor = isDark ? "rgba(255,255,255,.88)" : "rgba(28,35,40,.82)";

  return (
    <>
      <div
        className="absolute z-10 select-none"
        style={{ left: x, top, width: HOME_ICON_SIZE, height: HOME_ICON_SIZE }}
      >
        <AppIcon
          app={app}
          className="h-full w-full drop-shadow-[0_4px_7px_rgba(0,0,0,.28)]"
        />
      </div>
      <span
        className="absolute z-10 overflow-hidden text-center text-ellipsis whitespace-nowrap font-medium"
        style={{ left: x - 8, top: top + HOME_LABEL_TOP, width: HOME_ICON_SIZE + 16, color: labelColor, fontSize: fz(9), lineHeight: 1.2, textShadow: "0 1px 3px rgba(0,0,0,.25)" }}
      >
        {app.label}
      </span>
    </>
  );
}

function UserHomeIcon({ src, isDark }: { src: string; isDark: boolean }) {
  const x = HOME_START_X + USER_SLOT * (HOME_ICON_SIZE + HOME_GAP);
  const labelColor = isDark ? "rgba(255,255,255,.88)" : "rgba(28,35,40,.82)";

  return (
    <>
      <div
        className="absolute z-10 select-none"
        style={{ left: x, top: HOME_ROW_TOP, width: HOME_ICON_SIZE, height: HOME_ICON_SIZE }}
      >
        <img
          src={src}
          alt="Your app"
          draggable={false}
          className="h-full w-full object-contain drop-shadow-[0_4px_7px_rgba(0,0,0,.28)]"
        />
      </div>
      <span
        className="absolute z-10 overflow-hidden text-center text-ellipsis whitespace-nowrap font-medium"
        style={{ left: x - 8, top: HOME_ROW_TOP + HOME_LABEL_TOP, width: HOME_ICON_SIZE + 16, color: labelColor, fontSize: fz(9), lineHeight: 1.2, textShadow: "0 1px 3px rgba(0,0,0,.25)" }}
      >
        Your app
      </span>
    </>
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
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="ik-device" style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT }}>
      <span className="ik-device-button ik-device-button-volume-one" />
      <span className="ik-device-button ik-device-button-volume-two" />
      <span className="ik-device-button ik-device-button-power" />

      <div className="ik-device-screen" style={{ containerType: "inline-size" }}>
        <Wallpaper isDark={isDark} />
        <div className="absolute left-1/2 top-[12px] z-20 size-[12px] -translate-x-1/2 rounded-full bg-[#08090b] shadow-[0_0_0_1px_rgba(255,255,255,.08)]" />
        <StatusBar isDark={isDark} time={time} />
        <SearchBar isDark={isDark} />

        {HOME_APPS.map((app, index) => (
          <HomeApp key={app.id} app={app} slot={APP_SLOTS[index]} isDark={isDark} />
        ))}
        <UserHomeIcon src={images.themed ?? images.main} isDark={isDark} />
        {HOME_ROW2_APPS.map((app, index) => (
          <HomeApp key={app.id} app={app} slot={index} top={HOME_ROW2_TOP} isDark={isDark} />
        ))}

        <div
          className="absolute bottom-[4.2%] left-[4.2%] right-[4.2%] z-10 flex items-center justify-around rounded-[26px] px-[4%] backdrop-blur-md"
          style={{
            height: cy(70),
            background: isDark ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.55)",
            boxShadow: isDark
              ? "inset 0 0 0 1px rgba(255,255,255,.14)"
              : "0 7px 20px rgba(49,69,84,.13), inset 0 0 0 1px rgba(255,255,255,.66)",
          }}
        >
          {DOCK_APPS.map((app) => (
            <AppIcon
              key={app.id}
              app={app}
              className="drop-shadow-[0_4px_7px_rgba(0,0,0,.26)]"
              style={{ width: 48, height: 48 }}
            />
          ))}
        </div>

        <div
          className={`absolute bottom-[1.8%] left-1/2 z-20 h-[4px] w-[28%] -translate-x-1/2 rounded-full ${isDark ? "bg-white/60" : "bg-black/35"}`}
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

function IconPreview({ config, onIconSvg, appThemeDark }: Props) {
  const isDark = resolveDarkTheme(config.darkTheme, appThemeDark);
  const { images, error } = useMockupImages(config, config.darkTheme, appThemeDark);

  useEffect(() => {
    if (config.source !== "clipart") return;
    let cancelled = false;
    (async () => {
      await ensureIconsLoaded();
      if (cancelled) return;
      const Icon = loadIcon(config.clipartName);
      if (!Icon) return;
      try {
        const svg = renderToStaticMarkup(
          <Icon size={512} color={cssColorToHex(config.foregroundColor)} strokeWidth={1.5} />,
        );
        onIconSvg?.(svg);
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
            No se pudo renderizar la vista previa. Comprueba el icono o el
            color de fondo elegido.
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
