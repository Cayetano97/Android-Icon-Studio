export type IconSource = "clipart" | "text" | "image";
export type IconShape = "circle" | "square" | "squircle" | "none";

export interface GradientStop {
  color: string;
  position: number; // 0–100
}

export interface IconConfig {
  source: IconSource;
  // Clipart
  clipartName: string;
  // Text
  text: string;
  fontFamily: string;
  fontWeight: number;
  // Image
  imageDataUrl: string | null;
  // Styling
  foregroundColor: string;
  background: string;
  shape: IconShape;
  padding: number;
  // Foreground transforms
  foregroundScale: number; // 0.5–1.5, default 1.0
  foregroundOffsetX: number; // -50 to 50 (%), default 0
  foregroundOffsetY: number; // -50 to 50 (%), default 0
  foregroundRotation: number; // 0–360, default 0
  // Monochrome (Android 13+ themed icon)
  monochromeEnabled: boolean;
  monochromeColor: string;
}

export const DEFAULT_CONFIG: IconConfig = {
  source: "clipart",
  clipartName: "Zap",
  text: "Ab",
  fontFamily: "Inter",
  fontWeight: 700,
  imageDataUrl: null,
  foregroundColor: "rgba(255, 255, 255, 1)",
  background: "rgba(61, 220, 132, 1)",
  shape: "circle",
  padding: 20,
  foregroundScale: 1.0,
  foregroundOffsetX: 0,
  foregroundOffsetY: 0,
  foregroundRotation: 0,
  monochromeEnabled: false,
  monochromeColor: "rgba(255, 255, 255, 1)",
};
