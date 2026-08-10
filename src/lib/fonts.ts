export interface FontConfig {
  family: string;
  weights: number[];
  category: "sans-serif" | "serif" | "display" | "monospace" | "handwriting";
}

export const SUPPORTED_FONTS: FontConfig[] = [
  {
    family: "Inter",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: "sans-serif",
  },
  {
    family: "Roboto",
    weights: [100, 300, 400, 500, 700, 900],
    category: "sans-serif",
  },
  {
    family: "Montserrat",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: "sans-serif",
  },
  {
    family: "Bebas Neue",
    weights: [400],
    category: "display",
  },
  {
    family: "Playfair Display",
    weights: [400, 500, 600, 700, 800, 900],
    category: "serif",
  },
  {
    family: "Oswald",
    weights: [200, 300, 400, 500, 600, 700],
    category: "sans-serif",
  },
  {
    family: "Source Code Pro",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    category: "monospace",
  },
  {
    family: "Arvo",
    weights: [400, 700],
    category: "serif",
  },
  {
    family: "Lobster",
    weights: [400],
    category: "handwriting",
  },
  {
    family: "Pacifico",
    weights: [400],
    category: "handwriting",
  },
];
