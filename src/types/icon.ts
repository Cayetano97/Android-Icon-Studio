export type IconSource = "clipart" | "text" | "image";
export type IconShape = "circle" | "square" | "squircle" | "none";
export type GradientDirection = "to bottom" | "to right" | "to bottom right" | "to bottom left" | "to top" | "to top right";

export interface GradientStop {
  color: string;
  position: number; // 0–100
}

// GradientConfig removed as we use css strings now

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
}

export const DEFAULT_CONFIG: IconConfig = {
  source: "clipart",
  clipartName: "Zap",
  text: "Ab",
  fontFamily: "Inter",
  fontWeight: 700,
  imageDataUrl: null,
  foregroundColor: "rgba(255, 255, 255, 1)",
  background: "linear-gradient(135deg, rgba(61,220,132,1) 0%, rgba(0,188,212,1) 100%)",
  shape: "circle",
  padding: 20,
};
