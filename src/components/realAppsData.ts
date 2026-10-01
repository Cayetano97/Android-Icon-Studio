/**
 * Plain data catalog for the Pixel launcher mockup.
 *
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
