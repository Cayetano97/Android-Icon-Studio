let _colorCanvas: HTMLCanvasElement | null = null;
let _colorCtx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D | null {
  if (!_colorCanvas) {
    _colorCanvas = document.createElement("canvas");
    _colorCanvas.width = 1;
    _colorCanvas.height = 1;
    _colorCtx = _colorCanvas.getContext("2d");
  }
  return _colorCtx;
}

/**
 * Repairs known-invalid CSS colors so they can be parsed by the browser.
 * The legacy hsla form without "%" signs (e.g. "hsla(221,83,38,1)") is not
 * valid CSS: saturation/lightness must be percentages. This converts those
 * strings into an rgba() equivalent the canvas can consume.
 */
export function sanitizeCssColor(color: string): string {
  const m = color.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?))?\s*\)$/i,
  );
  if (m && !m[2].includes("%") && !m[3].includes("%")) {
    const { r, g, b, a } = parseCssColorToRgba(color);
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

/**
 * Converts any CSS color string to a 7-char hex (#rrggbb) using an offscreen canvas.
 */
export function cssColorToHex(color: string): string {
  if (color.startsWith("#")) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }
  const ctx = getCtx();
  if (!ctx) return color;
  ctx.fillStyle = "#000000";
  const previous = ctx.fillStyle;
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;
  if (computed.startsWith("#") && computed.length === 7 && computed !== previous) {
    return computed;
  }
  // Known-invalid legacy hsla: repair and retry once so it becomes a usable hex.
  const repaired = sanitizeCssColor(color);
  if (repaired !== color) {
    ctx.fillStyle = repaired;
    const fixed = ctx.fillStyle;
    if (fixed.startsWith("#") && fixed.length === 7) {
      return fixed;
    }
  }
  return color;
}

/**
 * Convert HSL components (h: 0-360, s/l: 0-100, a: 0-1) to { r, g, b, a }.
 */
function hslToRgba(
  h: number,
  s: number,
  l: number,
  a: number,
): { r: number; g: number; b: number; a: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  };
}

/**
 * Parse rgba()/rgb()/hsla()/hsl() string to { r, g, b, a }.
 * Supports both legacy comma syntax and the modern space+slash syntax.
 */
export function parseCssColorToRgba(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const m = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/,
  );
  if (m) {
    return {
      r: parseInt(m[1]),
      g: parseInt(m[2]),
      b: parseInt(m[3]),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  }
  const hslMatch = color.match(/hsla?\(([^)]+)\)/i);
  if (hslMatch) {
    const tokens = hslMatch[1].split(/[\s,/]+/).filter(Boolean);
    const num = (v?: string) => parseFloat((v ?? "0").replace(/deg/gi, ""));
    const h = num(tokens[0]);
    const s = num(tokens[1]);
    const l = num(tokens[2]);
    const aToken = tokens[3];
    let a = 1;
    if (aToken !== undefined) {
      const av = parseFloat(aToken);
      a = aToken.includes("%") ? av / 100 : av;
    }
    return hslToRgba(h, s, l, a);
  }
  const hex = cssColorToHex(color);
  if (hex.startsWith("#") && hex.length === 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
      a: 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Extract the first rgba/rgb/hsla/hsl/hex colour found in a CSS string.
 */
export function extractFirstColor(css: string): string {
  const rgbaMatch = css.match(/rgba?\([^)]+\)/);
  if (rgbaMatch) return rgbaMatch[0];
  const hslaMatch = css.match(/hsla?\([^)]+\)/);
  if (hslaMatch) return hslaMatch[0];
  const hexMatch = css.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  return "rgba(99,102,241,1)";
}

/**
 * Given a solid colour string, wrap into a gradient with a pleasant darkened stop.
 * Uses HSL darkening instead of a hardcoded second color.
 */
export function solidToGradient(color: string): string {
  const { r, g, b, a } = parseCssColorToRgba(color);
  // Convert to HSL
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
        break;
      case gg:
        h = ((bb - rr) / d + 2) / 6;
        break;
      case bb:
        h = ((rr - gg) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  const lDark = Math.max(10, lPct - 15);

  // Note: the gradient color picker library cannot parse hsla()/hsl() strings
  // (its parser only understands rgba()/rgb()/hex), so both stops are emitted
  // as rgba() — which every consumer (canvas, SVG, picker) accepts.
  const dark = hslToRgba(hDeg, sPct, lDark, a);
  return `linear-gradient(135deg, rgba(${r},${g},${b},${a}) 0%, rgba(${dark.r},${dark.g},${dark.b},${dark.a}) 100%)`;
}

/**
 * Rewrites every hsl()/hsla() color inside a CSS string into its rgba()
 * equivalent, so the value can be consumed by parsers that only understand
 * rgb-style colors (e.g. react-best-gradient-color-picker).
 */
export function normalizeGradientColors(css: string): string {
  return css.replace(/hsla?\(([^)]+)\)/gi, (match) => {
    const { r, g, b, a } = parseCssColorToRgba(match);
    return `rgba(${r},${g},${b},${a})`;
  });
}

/**
 * Given a gradient string, pull out the first colour stop as a solid color.
 */
export function gradientToSolid(css: string): string {
  return extractFirstColor(css);
}
