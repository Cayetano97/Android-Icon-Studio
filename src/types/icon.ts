export type IconSource = "clipart" | "text" | "image";
export type IconShape = "circle" | "square" | "squircle" | "none";
export type GradientDirection = "to bottom" | "to right" | "to bottom right" | "to bottom left" | "to top" | "to top right";

export interface GradientStop {
  color: string;
  position: number; // 0–100
}

export interface GradientConfig {
  enabled: boolean;
  stops: GradientStop[];
  direction: GradientDirection;
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
  backgroundColor: string;
  gradient: GradientConfig;
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
  foregroundColor: "#FFFFFF",
  backgroundColor: "#3DDC84",
  gradient: {
    enabled: false,
    stops: [
      { color: "#3DDC84", position: 0 },
      { color: "#00BCD4", position: 100 },
    ],
    direction: "to bottom right",
  },
  shape: "circle",
  padding: 20,
};
