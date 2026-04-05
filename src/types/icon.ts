export type IconSource = "clipart" | "text" | "image";
export type IconShape = "circle" | "square" | "squircle" | "none";

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
  shape: "circle",
  padding: 20,
};
