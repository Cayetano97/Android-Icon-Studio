import {
  useRef,
  useEffect,
  useId,
  useLayoutEffect,
  memo,
  useState,
  type ReactNode,
} from "react";
import type { PreviewImages } from "@/hooks/use-icon-images";
import {
  HOME_APPS,
  HOME_ROW2_APPS,
  HOME_ROW3_APPS,
  DOCK_APPS,
} from "@/components/realAppsData";
import {
  AppIcon,
  GoogleGLogo,
  MicGlyph,
  LensGlyph,
  PixelWeatherGlyph,
} from "@/components/RealApps";
import frameUrl from "@/assets/pixel-9-pro-frame.svg?url";

// Pixel 9 Pro chassis artwork is 353 x 745. The glass area starts 4.1% from
// the left, 4.8% from the right, 2.05% from the top and 1.8% from the bottom
// (measured from the original device frame).
const DEVICE_WIDTH = 353;
const DEVICE_HEIGHT = 745;

// Logical launcher viewport. Android reports 412 dp for the Pixel 9 Pro, and
// all launcher measurements below use those dp values. The screen is a CSS
// container, so `u()` converts dp to container-relative units and the whole
// UI stays sharp at any device size.
const SCREEN_W = 412;
const u = (dp: number) => `${(dp / SCREEN_W) * 100}cqw`;

const HOME_ICON = 58;
const GRID_LEFT = 24;
const GRID_PITCH = (SCREEN_W - GRID_LEFT * 2 - HOME_ICON) / 3;
const GRID_TOP = 196;
const ROW_PITCH = 126;
const USER_SLOT = 2;
const APP_SLOTS = [0, 1, 3];

const ICON_SHADOW = `drop-shadow(0 ${u(4)} ${u(9)} rgba(0,0,0,0.32)) drop-shadow(0 ${u(1)} ${u(2)} rgba(0,0,0,0.22))`;
const LABEL_W = 104;

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

  useLayoutEffect(() => {
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
          width: width * layout.scale,
          height: height * layout.scale,
          ["--device-w" as string]: `${width * layout.scale}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pixel 9 Pro wallpaper — a hand-drawn homage to the "Swirling Petals" set
// ---------------------------------------------------------------------------

function PixelWallpaper({ isDark }: { isDark: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${uid}-${name}`;

  if (isDark) {
    return (
      <svg
        className="pixel-wallpaper"
        viewBox="0 0 412 915"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id("bg")} x1="80" y1="0" x2="340" y2="915" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1b1528" />
            <stop offset="0.42" stopColor="#0d0b16" />
            <stop offset="0.78" stopColor="#081013" />
            <stop offset="1" stopColor="#060c0d" />
          </linearGradient>
          <linearGradient id={id("petalA")} x1="40" y1="60" x2="320" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a99aff" stopOpacity="0.82" />
            <stop offset="0.48" stopColor="#5646b0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#1a123a" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id={id("petalB")} x1="40" y1="560" x2="300" y2="820" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6fd6ca" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#1d6b72" stopOpacity="0.42" />
            <stop offset="1" stopColor="#082a2e" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={id("petalC")} x1="460" y1="300" x2="250" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c58cf0" stopOpacity="0.62" />
            <stop offset="0.52" stopColor="#5b2f83" stopOpacity="0.42" />
            <stop offset="1" stopColor="#1c0d2a" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id={id("glowA")} cx="0.8" cy="0.08" r="0.45">
            <stop stopColor="#b06cd8" stopOpacity="0.4" />
            <stop offset="1" stopColor="#b06cd8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("glowB")} cx="0.08" cy="0.4" r="0.42">
            <stop stopColor="#2b8b8f" stopOpacity="0.26" />
            <stop offset="1" stopColor="#2b8b8f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("glowC")} cx="0.68" cy="0.86" r="0.4">
            <stop stopColor="#6f2f63" stopOpacity="0.3" />
            <stop offset="1" stopColor="#6f2f63" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("vignette")} cx="0.5" cy="0.36" r="0.78">
            <stop offset="0.52" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.52" />
          </radialGradient>
          <linearGradient id={id("petalD")} x1="250" y1="620" x2="430" y2="820" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d77b9d" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#7c3156" stopOpacity="0.36" />
            <stop offset="1" stopColor="#2a0f21" stopOpacity="0.04" />
          </linearGradient>
          <filter id={id("blurXl")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="52" />
          </filter>
          <filter id={id("blurL")} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={id("blurS")} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="3" stitchTiles="stitch" />
          </filter>
        </defs>

        <rect width="412" height="915" fill={`url(#${id("bg")})`} />
        <rect width="412" height="915" fill={`url(#${id("glowA")})`} />
        <rect width="412" height="915" fill={`url(#${id("glowB")})`} />
        <rect width="412" height="915" fill={`url(#${id("glowC")})`} />

        <g filter={`url(#${id("blurL")})`}>
          <path
            d="M-40 300C30 140 180 60 370 110C320 210 270 290 170 355C80 410 10 390-40 300Z"
            fill={`url(#${id("petalA")})`}
            stroke="#c9bcff"
            strokeOpacity="0.26"
            strokeWidth="2"
            opacity="0.94"
          />
          <path
            d="M200 300C285 200 405 200 480 320C430 435 355 505 265 545C200 500 178 400 200 300Z"
            fill={`url(#${id("petalC")})`}
            stroke="#d9b1ff"
            strokeOpacity="0.24"
            strokeWidth="2"
          />
          <path
            d="M250 600C340 540 440 590 470 720C420 840 330 890 230 840C190 760 200 660 250 600Z"
            fill={`url(#${id("petalD")})`}
            stroke="#ffc2dc"
            strokeOpacity="0.2"
            strokeWidth="2"
          />
          <path
            d="M-100 520C20 465 170 520 260 650C205 785 75 860-60 800C-120 720-140 610-100 520Z"
            fill={`url(#${id("petalB")})`}
            stroke="#a5fff2"
            strokeOpacity="0.2"
            strokeWidth="2"
          />
        </g>

        {/* Petal veins catch the light like the stock wallpaper. */}
        <g filter={`url(#${id("blurS")})`} opacity="0.7">
          <path d="M20 245C130 110 270 120 350 185" fill="none" stroke="#f0d4ff" strokeWidth="1.4" opacity="0.5" />
          <path d="M205 315C320 270 400 340 405 430" fill="none" stroke="#ffc4dd" strokeWidth="1.3" opacity="0.42" />
          <path d="M255 640C350 600 405 670 415 760" fill="none" stroke="#ffd0e2" strokeWidth="1.2" opacity="0.3" />
          <path d="M-40 580C100 520 240 580 285 700" fill="none" stroke="#a8fff2" strokeWidth="1.3" opacity="0.3" />
        </g>

        <g filter={`url(#${id("blurXl")})`} opacity="0.75">
          <ellipse cx="345" cy="95" rx="150" ry="120" fill="#9b5ac4" opacity="0.28" />
          <ellipse cx="60" cy="330" rx="150" ry="220" fill="#2b8b8f" opacity="0.22" />
          <ellipse cx="370" cy="760" rx="150" ry="150" fill="#a34876" opacity="0.2" />
        </g>

        <rect width="412" height="915" fill={`url(#${id("vignette")})`} />
        <rect
          width="412"
          height="915"
          filter={`url(#${id("grain")})`}
          opacity="0.06"
          style={{ mixBlendMode: "overlay" }}
        />
      </svg>
    );
  }

  return (
    <svg
      className="pixel-wallpaper"
      viewBox="0 0 412 915"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id("bg")} x1="60" y1="0" x2="360" y2="915" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4f2ec" />
          <stop offset="0.48" stopColor="#e9e7f0" />
          <stop offset="1" stopColor="#e2efe8" />
        </linearGradient>
        <linearGradient id={id("petalA")} x1="30" y1="60" x2="320" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f9c9d8" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#eeb3c8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#f9c9d8" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={id("petalB")} x1="20" y1="520" x2="310" y2="830" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cfe7d3" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="#b3d6bb" stopOpacity="0.32" />
          <stop offset="1" stopColor="#cfe7d3" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={id("petalC")} x1="460" y1="300" x2="250" y2="540" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9c8f2" stopOpacity="0.72" />
          <stop offset="0.55" stopColor="#c0a9de" stopOpacity="0.3" />
          <stop offset="1" stopColor="#d9c8f2" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={id("petalD")} x1="260" y1="620" x2="440" y2="840" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4d3c1" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#e7b79f" stopOpacity="0.26" />
          <stop offset="1" stopColor="#f4d3c1" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id={id("glowA")} cx="0.78" cy="0.12" r="0.6">
          <stop stopColor="#ffd9e5" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd9e5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("glowB")} cx="0.12" cy="0.38" r="0.55">
          <stop stopColor="#bcd7f5" stopOpacity="0.62" />
          <stop offset="1" stopColor="#bcd7f5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("glowC")} cx="0.6" cy="0.84" r="0.52">
          <stop stopColor="#f5d6bc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f5d6bc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("vignette")} cx="0.5" cy="0.36" r="0.8">
          <stop offset="0.55" stopColor="#4b4a63" stopOpacity="0" />
          <stop offset="1" stopColor="#4b4a63" stopOpacity="0.13" />
        </radialGradient>
        <filter id={id("blurXl")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="56" />
        </filter>
        <filter id={id("blurL")} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={id("blurS")} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
      </defs>

      <rect width="412" height="915" fill={`url(#${id("bg")})`} />
      <rect width="412" height="915" fill={`url(#${id("glowA")})`} />
      <rect width="412" height="915" fill={`url(#${id("glowB")})`} />
      <rect width="412" height="915" fill={`url(#${id("glowC")})`} />

      <g filter={`url(#${id("blurL")})`}>
        <path
          d="M-40 300C30 140 180 60 370 110C320 210 270 290 170 355C80 410 10 390-40 300Z"
          fill={`url(#${id("petalA")})`}
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        <path
          d="M200 300C285 200 405 200 480 320C430 435 355 505 265 545C200 500 178 400 200 300Z"
          fill={`url(#${id("petalC")})`}
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <path
          d="M250 600C340 540 440 590 470 720C420 840 330 890 230 840C190 760 200 660 250 600Z"
          fill={`url(#${id("petalD")})`}
          stroke="#ffffff"
          strokeOpacity="0.42"
          strokeWidth="2"
        />
        <path
          d="M-100 520C20 465 170 520 260 650C205 785 75 860-60 800C-120 720-140 610-100 520Z"
          fill={`url(#${id("petalB")})`}
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
      </g>

      <g filter={`url(#${id("blurS")})`} opacity="0.6">
        <path d="M20 245C130 110 270 120 350 185" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.8" />
        <path d="M205 315C320 270 400 340 405 430" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.62" />
        <path d="M-40 580C100 520 240 580 285 700" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.5" />
      </g>

      <rect width="412" height="915" fill={`url(#${id("vignette")})`} />
      <rect
        width="412"
        height="915"
        filter={`url(#${id("grain")})`}
        opacity="0.04"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pixel System UI
// ---------------------------------------------------------------------------

function PixelStatusBar({ isDark, time }: { isDark: boolean; time: string }) {
  const color = isDark ? "rgba(255,255,255,0.96)" : "rgba(20,22,26,0.94)";
  return (
    <div
      className="absolute z-20 flex select-none items-center justify-between"
      style={{
        top: u(18),
        left: u(22),
        right: u(22),
        height: u(30),
        color,
        fontFamily: "'Roboto', system-ui, sans-serif",
      }}
    >
      <span
        style={{
          fontSize: u(14),
          fontWeight: 500,
          letterSpacing: u(0.15),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </span>
      <div className="flex items-center" style={{ gap: u(6.5) }} aria-hidden="true">
        <span style={{ fontSize: u(9.5), fontWeight: 700, letterSpacing: u(0.1) }}>
          5G
        </span>
        <svg width={u(16)} height={u(12)} viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="8" width="2.9" height="4" rx="0.9" />
          <rect x="4.7" y="5.6" width="2.9" height="6.4" rx="0.9" />
          <rect x="9.4" y="3.2" width="2.9" height="8.8" rx="0.9" />
          <rect x="14.1" y="0.8" width="2.9" height="11.2" rx="0.9" />
        </svg>
        <svg width={u(15)} height={u(11.5)} viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 11.2a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm-3.1-2.4a4.6 4.6 0 0 1 6.2 0l-1.1 1.1a3.1 3.1 0 0 0-4 0L4.9 8.8Zm-2.2-2.2a7.8 7.8 0 0 1 10.6 0l-1.1 1.1a6.3 6.3 0 0 0-8.4 0L2.7 6.6Zm-2.2-2.2a11 11 0 0 1 15 0l-1.1 1.1a9.5 9.5 0 0 0-12.8 0L.5 4.4Z" />
        </svg>
        <svg width={u(24)} height={u(13)} viewBox="0 0 24 13" className="block">
          <rect x="0" y="0.75" width="21.2" height="11.5" rx="3.2" fill="currentColor" />
          <rect x="21.7" y="4.25" width="1.9" height="4.5" rx="0.95" fill="currentColor" opacity="0.55" />
          <text
            x="10.6"
            y="9.15"
            textAnchor="middle"
            fontSize="7.4"
            fontWeight="700"
            fontFamily="'Roboto', system-ui, sans-serif"
            fill={isDark ? "#0b0d12" : "#f2f1ec"}
          >
            78
          </text>
        </svg>
      </div>
    </div>
  );
}

function AtAGlance({ isDark, dateStr }: { isDark: boolean; dateStr: string }) {
  return (
    <div
      className="absolute select-none"
      style={{
        top: u(64),
        left: u(24),
        right: u(24),
        fontFamily: "'Roboto', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: u(15),
          fontWeight: 500,
          letterSpacing: u(0.05),
          color: isDark ? "#ffffff" : "#1a1c1e",
          textShadow: isDark
            ? "0 1px 8px rgba(0,0,0,0.35)"
            : "0 1px 6px rgba(255,255,255,0.55)",
        }}
      >
        {dateStr}
      </div>
      <div
        className="flex items-center"
        style={{
          marginTop: u(5),
          gap: u(7),
          color: isDark ? "rgba(255,255,255,0.94)" : "rgba(26,28,30,0.86)",
        }}
      >
        <PixelWeatherGlyph size={u(23)} />
        <span style={{ fontSize: u(13), fontWeight: 400 }}>
          21°&nbsp;&nbsp;Mostly sunny
        </span>
      </div>
    </div>
  );
}

function PixelSearchBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="absolute z-10 flex select-none items-center"
      style={{
        left: u(18),
        right: u(18),
        bottom: u(104),
        height: u(54),
        borderRadius: u(27),
        paddingLeft: u(17),
        paddingRight: u(14),
        background: isDark ? "rgba(31,33,38,0.9)" : "rgba(255,255,255,0.94)",
        boxShadow: isDark
          ? "0 8px 24px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 8px 24px rgba(30,45,60,0.16), inset 0 0 0 1px rgba(255,255,255,0.92), inset 0 1px 0 rgba(255,255,255,0.9)",
        backdropFilter: "blur(16px)",
        fontFamily: "'Roboto', system-ui, sans-serif",
      }}
    >
      <GoogleGLogo size={u(20)} />
      <span
        style={{
          marginLeft: u(13),
          fontSize: u(14.5),
          color: isDark ? "rgba(255,255,255,0.78)" : "#5f6368",
          fontWeight: 400,
        }}
      >
        Search
      </span>
      <span className="ml-auto flex items-center" style={{ gap: u(15) }}>
        <MicGlyph size={u(20)} color={isDark ? "#e8eaed" : "#5f6368"} />
        <LensGlyph size={u(21)} ringColor={isDark ? "#e8eaed" : "#5f6368"} />
      </span>
    </div>
  );
}

function HomeLabel({
  top,
  label,
  isDark,
}: {
  top: number | string;
  label: string;
  isDark: boolean;
}) {
  return (
    <span
      className="absolute z-10 overflow-hidden text-center text-ellipsis whitespace-nowrap"
      style={{
        left: u((HOME_ICON - LABEL_W) / 2),
        top,
        width: u(LABEL_W),
        color: isDark ? "#ffffff" : "#1a1c1e",
        fontSize: u(11.5),
        fontWeight: 500,
        lineHeight: 1.2,
        fontFamily: "'Roboto', system-ui, sans-serif",
        textShadow: isDark
          ? "0 1px 4px rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.32)"
          : "0 1px 2px rgba(255,255,255,0.8), 0 0 6px rgba(255,255,255,0.55)",
      }}
    >
      {label}
    </span>
  );
}

function DeviceMockup({
  phone,
  isDark,
}: {
  phone: string;
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

  const renderSlot = (
    key: string,
    slot: number,
    rowTop: number,
    node: ReactNode,
    label: string,
  ) => {
    const x = GRID_LEFT + slot * GRID_PITCH;
    return (
      <div key={key} className="absolute" style={{ left: u(x), top: u(rowTop) }}>
        <div
          className="absolute select-none"
          style={{
            left: 0,
            top: 0,
            width: u(HOME_ICON),
            height: u(HOME_ICON),
            filter: ICON_SHADOW,
          }}
        >
          {node}
        </div>
        <HomeLabel top={u(HOME_ICON + 4)} label={label} isDark={isDark} />
      </div>
    );
  };

  const userX = GRID_LEFT + USER_SLOT * GRID_PITCH;

  return (
    <div className="pixel-device h-full w-full">
      <div className="pixel-device-screen">
        <PixelWallpaper isDark={isDark} />
        <PixelStatusBar isDark={isDark} time={time} />
        <AtAGlance isDark={isDark} dateStr={dateStr} />

        {HOME_APPS.map((app, index) =>
          renderSlot(
            app.id,
            APP_SLOTS[index],
            GRID_TOP,
            <AppIcon app={app} className="h-full w-full" />,
            app.label,
          ),
        )}

        {/* The user's icon takes the center slot of the first row. */}
        <div className="absolute" style={{ left: u(userX), top: u(GRID_TOP) }}>
          <div
            className="absolute select-none"
            style={{
              left: 0,
              top: 0,
              width: u(HOME_ICON),
              height: u(HOME_ICON),
              filter: ICON_SHADOW,
            }}
          >
            <img
              src={phone}
              alt=""
              width={192}
              height={192}
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
          <HomeLabel top={u(HOME_ICON + 4)} label="Your app" isDark={isDark} />
        </div>

        {HOME_ROW2_APPS.map((app, index) =>
          renderSlot(
            app.id,
            index,
            GRID_TOP + ROW_PITCH,
            <AppIcon app={app} className="h-full w-full" />,
            app.label,
          ),
        )}

        {HOME_ROW3_APPS.map((app, index) =>
          renderSlot(
            app.id,
            index,
            GRID_TOP + ROW_PITCH * 2,
            <AppIcon app={app} className="h-full w-full" />,
            app.label,
          ),
        )}

        <PixelSearchBar isDark={isDark} />

        {/* Pixel dock: floating icons without a plate */}
        <div
          className="absolute left-0 right-0 z-10 flex items-center justify-center"
          style={{ bottom: u(28), gap: u(26) }}
        >
          {DOCK_APPS.map((app) => (
            <div key={app.id} style={{ filter: ICON_SHADOW }}>
              <AppIcon app={app} style={{ width: u(HOME_ICON), height: u(HOME_ICON) }} />
            </div>
          ))}
        </div>

        {/* Gesture pill */}
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full"
          style={{
            bottom: u(8),
            width: u(108),
            height: u(4),
            background: isDark ? "rgba(255,255,255,0.92)" : "rgba(18,20,24,0.72)",
          }}
        />

        <div className="pixel-device-glass" aria-hidden="true" />
      </div>

      <img
        src={frameUrl}
        alt=""
        draggable={false}
        className="pixel-device-chassis"
      />
    </div>
  );
}

/**
 * Pixel 9 Pro launcher mockup. The whole mockup is decorative: the board's
 * <figcaption> carries the accessible description, so the internals are hidden
 * from assistive tech instead of reading every fake app label.
 */
export const PhonePreview = memo(function PhonePreview({
  images,
  isDark,
}: {
  images: PreviewImages;
  isDark: boolean;
}) {
  return (
    <div className="h-full w-full" aria-hidden="true">
      <ScaledStage width={DEVICE_WIDTH} height={DEVICE_HEIGHT}>
        <DeviceMockup phone={images.phone} isDark={isDark} />
      </ScaledStage>
    </div>
  );
});
