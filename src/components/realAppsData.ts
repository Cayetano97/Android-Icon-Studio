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
  iconUrl?: string;
  /** Size of the logo relative to the icon tile (%). */
  fit?: number;
  /** Draw a custom launcher glyph instead of a product icon. */
  glyph?: "phone";
}

// ---------------------------------------------------------------------------
// Catalog (official product icons)
// ---------------------------------------------------------------------------

export const Chrome: RealApp = {
  id: "chrome",
  label: "Chrome",
  bg: "#ffffff",
  iconUrl: icon("chrome"),
  fit: 84,
};

export const Gmail: RealApp = {
  id: "gmail",
  label: "Gmail",
  bg: "#ffffff",
  iconUrl: icon("gmail"),
  fit: 76,
};

export const Maps: RealApp = {
  id: "maps",
  label: "Maps",
  bg: "#ffffff",
  iconUrl: icon("maps"),
  fit: 80,
};

export const PlayStore: RealApp = {
  id: "playstore",
  label: "Play Store",
  bg: "#ffffff",
  iconUrl: icon("play_store"),
  fit: 76,
};

export const PhoneApp: RealApp = {
  id: "phone",
  label: "Phone",
  bg: "linear-gradient(160deg,#4aa3ff 0%,#1a73e8 55%,#0b57d0 100%)",
  glyph: "phone",
};

export const Messages: RealApp = {
  id: "messages",
  label: "Messages",
  bg: "#ffffff",
  iconUrl: icon("messages"),
  fit: 100,
};

export const Camera: RealApp = {
  id: "camera",
  label: "Camera",
  bg: "#ffffff",
  iconUrl: icon("camera"),
  fit: 88,
};

export const Photos: RealApp = {
  id: "photos",
  label: "Photos",
  bg: "#ffffff",
  iconUrl: icon("photos"),
  fit: 82,
};

export const YouTube: RealApp = {
  id: "youtube",
  label: "YouTube",
  bg: "#ffffff",
  iconUrl: icon("youtube"),
  fit: 84,
};

export const Drive: RealApp = {
  id: "drive",
  label: "Drive",
  bg: "#ffffff",
  iconUrl: icon("drive"),
  fit: 80,
};

export const Clock: RealApp = {
  id: "clock",
  label: "Clock",
  bg: "#ffffff",
  iconUrl: icon("clock"),
  fit: 96,
};

export const Calendar: RealApp = {
  id: "calendar",
  label: "Calendar",
  bg: "#ffffff",
  iconUrl: icon("calendar"),
  fit: 100,
};

export const Keep: RealApp = {
  id: "keep",
  label: "Keep",
  bg: "#ffffff",
  iconUrl: icon("keep"),
  fit: 100,
};

export const Files: RealApp = {
  id: "files",
  label: "Files",
  bg: "#ffffff",
  iconUrl: icon("files"),
  fit: 100,
};

export const Gemini: RealApp = {
  id: "gemini",
  label: "Gemini",
  bg: "#ffffff",
  iconUrl: icon("gemini"),
  fit: 92,
};

// ---------------------------------------------------------------------------
// Home setup (default Pixel style)
// ---------------------------------------------------------------------------

/** Top row: 3 apps + center slot for the user icon. */
export const HOME_APPS: RealApp[] = [PlayStore, Gmail, Maps];

/** Full second row. */
export const HOME_ROW2_APPS: RealApp[] = [Photos, YouTube, Drive, Clock];

/** Third row keeps the home screen from looking like an empty demo. */
export const HOME_ROW3_APPS: RealApp[] = [Calendar, Keep, Files, Gemini];

/** Pixel dock: Phone, Messages, Chrome, Camera (floating, no plate). */
export const DOCK_APPS: RealApp[] = [PhoneApp, Messages, Chrome, Camera];

