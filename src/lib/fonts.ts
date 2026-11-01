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

// ---------------------------------------------------------------------------
// Preview font loading
// ---------------------------------------------------------------------------

const fontLinkCache = new Map<string, Promise<void>>();

export function ensureFontLoaded(family: string, weight = 400): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  let linkReady = fontLinkCache.get(family);
  if (!linkReady) {
    const config = SUPPORTED_FONTS.find((font) => font.family === family);
    if (!config) return Promise.resolve();
    const weights = config.weights.join(";");
    const href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(family).replace(/%20/g, "+") +
      ":wght@" +
      weights +
      "&display=swap";
    const id = "ais-font-" + family.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    linkReady = new Promise<void>((resolve) => {
      const existing = document.getElementById(id) as HTMLLinkElement | null;
      if (existing) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
    fontLinkCache.set(family, linkReady);
  }

  // Always request the concrete weight: the stylesheet lists every supported
  // weight but the browser fetches each face lazily. Caching only the link
  // promise (not the first weight) keeps weight changes sharp on canvas.
  return linkReady.then(async () => {
    try {
      await document.fonts.load(`${weight} 16px "${family}"`);
    } catch {
      /* fall back to the system stack */
    }
  });
}

