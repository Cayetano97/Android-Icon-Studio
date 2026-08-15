import type { CSSProperties } from "react";
import { useUiIcons } from "@/lib/uiIcons";

/**
 * Real Android launcher icons using Google's official product icons
 * (served from www.gstatic.com — the same CDN Google uses for its own
 * product logos), rendered inside the squircle mask used by Pixel launchers.
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
      style={{ background: app.bg, borderRadius: "22%", ...style }}
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
      {/* Material-style inner highlights */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow:
            "inset 0 1.5px 1px rgba(255,255,255,0.30), inset 0 -1.5px 2px rgba(0,0,0,0.14), inset 0 0 0 0.6px rgba(0,0,0,0.10)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App catalog (official Google product icons)
// ---------------------------------------------------------------------------

export const Chrome: RealApp = {
  id: "chrome",
  label: "Chrome",
  bg: "#ffffff",
  iconUrl: icon("chrome"),
  fit: 96,
};

export const Gmail: RealApp = {
  id: "gmail",
  label: "Gmail",
  bg: "#ffffff",
  iconUrl: icon("gmail"),
  fit: 88,
};

export const Maps: RealApp = {
  id: "maps",
  label: "Maps",
  bg: "#ffffff",
  iconUrl: icon("maps"),
  fit: 95,
};

export const PlayStore: RealApp = {
  id: "playstore",
  label: "Play Store",
  bg: "#ffffff",
  iconUrl: icon("play_store"),
  fit: 88,
};

export const PhoneApp: RealApp = {
  id: "phone",
  label: "Phone",
  bg: "linear-gradient(160deg,#1a73e8,#0b57d0)",
  iconUrl: icon("dialer"),
  fit: 48,
  tintWhite: true,
};

export const Messages: RealApp = {
  id: "messages",
  label: "Messages",
  bg: "linear-gradient(160deg,#3b8df3,#1967d2)",
  iconUrl: icon("messages"),
  fit: 92,
};

export const Camera: RealApp = {
  id: "camera",
  label: "Camera",
  bg: "linear-gradient(160deg,#6b7076,#3d4247)",
  iconUrl: icon("camera"),
  fit: 94,
};

export const Photos: RealApp = {
  id: "photos",
  label: "Photos",
  bg: "#ffffff",
  iconUrl: icon("photos"),
  fit: 84,
};

export const YouTube: RealApp = {
  id: "youtube",
  label: "YouTube",
  iconUrl: icon("youtube"),
  fit: 96,
};

export const Drive: RealApp = {
  id: "drive",
  label: "Drive",
  bg: "#ffffff",
  iconUrl: icon("drive"),
  fit: 92,
};

export const Clock: RealApp = {
  id: "clock",
  label: "Clock",
  bg: "linear-gradient(160deg,#38465a,#141a22)",
  iconUrl: icon("clock"),
  fit: 88,
};

// ---------------------------------------------------------------------------
// Home screen configuration
// ---------------------------------------------------------------------------

/** Apps on the home screen row above the user's icon. */
export const HOME_APPS: RealApp[] = [Chrome, Gmail, Maps];

/** Apps on the second home screen row. */
export const HOME_ROW2_APPS: RealApp[] = [Photos, YouTube, Drive, Clock];

/** Dock apps (Pixel style: no labels). */
export const DOCK_APPS: RealApp[] = [PhoneApp, Messages, PlayStore, Camera];

// ---------------------------------------------------------------------------
// Small UI glyphs (search bar / at-a-glance)
// ---------------------------------------------------------------------------

export function GoogleGLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
        fill="#4285F4"
      />
    </svg>
  );
}

export function SunCloudGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="7.5" r="3.1" />
      <path d="M6.9 19.6 c-1.9 0-3.4-1.5-3.4-3.4 0-1.7 1.3-3.2 3-3.4.4-2.4 2.5-4.2 5-4.2 1.6 0 3 .7 4 1.9 2 .2 3.5 1.9 3.5 3.9 0 .3 0 .6-.1.9 1.6.3 2.7 1.7 2.7 3.3 0 1.9-1.6 3.5-3.5 3.5Z" />
    </svg>
  );
}

export function MicGlyph({ size = 13 }: { size?: number }) {
  const I = useUiIcons();
  return <I.Mic size={size} strokeWidth={2} />;
}
