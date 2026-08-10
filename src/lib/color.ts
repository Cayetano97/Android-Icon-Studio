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
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;
  if (computed.startsWith("#") && computed.length === 7) {
    return computed;
  }
  return color;
}

/**
 * Alias kept for backward-compat in downloadIcon.ts.
 */
export const parseCssColorToHex = cssColorToHex;

/**
 * Parse rgba()/rgb() string to { r, g, b, a }.
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
 * Extract the first rgba/rgb/hex colour found in a CSS string.
 */
export function extractFirstColor(css: string): string {
  const rgbaMatch = css.match(/rgba?\([^)]+\)/);
  if (rgbaMatch) return rgbaMatch[0];
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

  return `linear-gradient(135deg, rgba(${r},${g},${b},${a}) 0%, hsla(${hDeg},${sPct},${lDark},${a}) 100%)`;
}

/**
 * Given a gradient string, pull out the first colour stop as a solid color.
 */
export function gradientToSolid(css: string): string {
  return extractFirstColor(css);
}
