import type { CSSProperties } from "react";

/**
 * Real Pixel launcher icons using the official Google product icons
 * (same gstatic CDN Google uses) with a circular mask, which is
 * the Pixel Launcher default (Wallpaper & style > App grid).
 *
 * References:
 * - Google Store Pixel 9 Pro specs: polished aluminum frame, flat
 *   Gorilla Glass Victus 2, 152.8 x 72 x 8.5mm, 20:9, 1280x2856 495PPI
 * - Pixel Launcher: At a Glance pinned on top, search pill at the bottom,
 *   plateless dock with floating icons, gesture pill.
 * - Google brand colors: #4285F4 #EA4335 #FBBC05 #34A853
 */

const PRODUCT_ICONS = "https://www.gstatic.com/images/branding/product/2x";
const icon = (name: string) => `${PRODUCT_ICONS}/${name}_96dp.png`;

export interface RealApp {
  id: string;
  label: string;
  /** CSS background behind the logo (solid color or gradient). */
  bg?: string;
  /** Official Google product-icon URL. */
  iconUrl: string;
  /** Size of the logo relative to the icon tile (%). */
  fit?: number;
  /** Force the logo to solid white (monochrome glyphs on colored tiles). */
  tintWhite?: boolean;
}

export function AppIcon({
  app,
  className,
  style,
}: {
  app: RealApp;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        background: app.bg ?? "#fff",
        // Pixel Launcher: circular mask by default
        borderRadius: "50%",
        ...style,
      }}
      role="img"
      aria-label={app.label}
    >
      <img
        src={app.iconUrl}
        alt=""
        draggable={false}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `${app.fit ?? 88}%`,
          height: `${app.fit ?? 88}%`,
          objectFit: "contain",
          filter: app.tintWhite ? "brightness(0) invert(1)" : undefined,
        }}
      />
      {/* Inner light + ring like on real adaptive icons */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 0 0 0.8px rgba(0,0,0,0.12)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog (official product icons)
// ---------------------------------------------------------------------------

export const Chrome: RealApp = {
  id: "chrome",
  label: "Chrome",
  bg: "#ffffff",
  iconUrl: icon("chrome"),
  fit: 100,
};

export const Gmail: RealApp = {
  id: "gmail",
  label: "Gmail",
  bg: "#ffffff",
  iconUrl: icon("gmail"),
  fit: 82,
};

export const Maps: RealApp = {
  id: "maps",
  label: "Maps",
  bg: "#ffffff",
  iconUrl: icon("maps"),
  fit: 92,
};

export const PlayStore: RealApp = {
  id: "playstore",
  label: "Play Store",
  bg: "#ffffff",
  iconUrl: icon("play_store"),
  fit: 82,
};

export const PhoneApp: RealApp = {
  id: "phone",
  label: "Phone",
  bg: "linear-gradient(160deg,#3b8bf6 0%,#1a73e8 55%,#0b57d0 100%)",
  iconUrl: icon("voice"),
  fit: 52,
  tintWhite: true,
};

export const Messages: RealApp = {
  id: "messages",
  label: "Messages",
  bg: "linear-gradient(160deg,#2f7cf6 0%,#1967d2 100%)",
  iconUrl: icon("messages"),
  fit: 88,
};

export const Camera: RealApp = {
  id: "camera",
  label: "Camera",
  bg: "linear-gradient(160deg,#5f6368 0%,#3c4043 60%,#202124 100%)",
  iconUrl: icon("camera"),
  fit: 88,
};

export const Photos: RealApp = {
  id: "photos",
  label: "Photos",
  bg: "#ffffff",
  iconUrl: icon("photos"),
  fit: 80,
};

export const YouTube: RealApp = {
  id: "youtube",
  label: "YouTube",
  bg: "#ffffff",
  iconUrl: icon("youtube"),
  fit: 92,
};

export const Drive: RealApp = {
  id: "drive",
  label: "Drive",
  bg: "#ffffff",
  iconUrl: icon("drive"),
  fit: 84,
};

export const Clock: RealApp = {
  id: "clock",
  label: "Clock",
  bg: "linear-gradient(160deg,#3c4043 0%,#17191c 100%)",
  iconUrl: icon("clock"),
  fit: 84,
};

// ---------------------------------------------------------------------------
// Home setup (default Pixel style)
// ---------------------------------------------------------------------------

/** Top row: 3 apps + center slot for the user icon. */
export const HOME_APPS: RealApp[] = [PlayStore, Gmail, Maps];

/** Full second row. */
export const HOME_ROW2_APPS: RealApp[] = [Photos, YouTube, Drive, Clock];

/** Pixel dock: Phone, Messages, Chrome, Camera (floating, no plate). */
export const DOCK_APPS: RealApp[] = [PhoneApp, Messages, Chrome, Camera];

// ---------------------------------------------------------------------------
// Official glyphs
// ---------------------------------------------------------------------------

/** Official Google G in 4 colors (#4285F4 #EA4335 #FBBC05 #34A853). */
export function GoogleGLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

/** Pixel search-pill microphone (gray #5f6368 like the real launcher). */
export function MicGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="#5f6368" />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0"
        stroke="#5f6368"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3.5"
        stroke="#5f6368"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Simplified Google Lens with the 4 official colors. */
export function LensGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="7.2"
        fill="none"
        stroke="#5f6368"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="2.6" fill="#4285F4" />
      <path
        d="M12 4.8A7.2 7.2 0 0 1 18.1 9"
        fill="none"
        stroke="#EA4335"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.8 12A7.2 7.2 0 0 1 9 5.9"
        fill="none"
        stroke="#FBBC05"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 19.2A7.2 7.2 0 0 1 5.9 15"
        fill="none"
        stroke="#34A853"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pixel Weather icon (sun behind cloud). */
export function PixelWeatherGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.4" fill="#FBBC05" />
      <g fill="#fff" opacity="0.95">
        <ellipse cx="13.5" cy="15.5" rx="5.2" ry="3.4" />
        <ellipse cx="10" cy="14.2" rx="3" ry="2.6" />
        <ellipse cx="17" cy="14.2" rx="3" ry="2.8" />
      </g>
      <g fill="#DADCE0" opacity="0.9">
        <ellipse cx="13.5" cy="17.2" rx="5" ry="1.4" />
      </g>
    </svg>
  );
}
