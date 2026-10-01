import { parseCssGradient } from "@/lib/canvasGradient";
import { parseCssColorToRgba, solidToGradient } from "@/lib/color";

/**
 * Gradient APPLICATION templates: they don't pin colors, they pin *how*
 * the gradient is distributed between your two base colors (A → B).
 *
 * Everything generated here goes through the same parser as the canvas
 * preview (`parseCssGradient`), the SVG export and the VectorDrawable, so
 * what you see is what gets exported. Only centered linear + radial,
 * which is what the renderer supports today.
 *
 * References:
 * - MDN: `linear-gradient(<angle>deg, <color> <pos>, …)`,
 *   `radial-gradient(circle at center, …)`.
 * - Android GradientDrawable: `angle` in 45-degree steps
 *   (CSS 135° ↘ maps to `angle="315"`; 45° ↙ to `angle="45"`;
 *   90° → to `angle="0"`; 180° to `angle="270"`).
 */

export interface GradientPattern {
  id: string;
  name: string;
  /** Short distribution label (e.g. "135° ↘") */
  hint: string;
  /** When to use it */
  description: string;
  /** Android export note */
  android: string;
  build: (c1: string, c2: string) => string;
}

/** Normalizes any CSS color to `rgba(r,g,b,a)`. */
export function toRgba(color: string): string {
  const { r, g, b, a } = parseCssColorToRgba(color);
  return `rgba(${r},${g},${b},${a})`;
}

/** Blends two colors at 50% (middle stop of the Trio pattern). */
export function mixColors(c1: string, c2: string): string {
  const a = parseCssColorToRgba(c1);
  const b = parseCssColorToRgba(c2);
  const m = (x: number, y: number) => Math.round((x + y) / 2);
  const alpha = Math.round(((a.a + b.a) / 2) * 100) / 100;
  return `rgba(${m(a.r, b.r)},${m(a.g, b.g)},${m(a.b, b.b)},${alpha})`;
}

function darkened(color: string): string {
  const parsed = parseCssGradient(solidToGradient(color));
  const last = parsed?.stops[parsed.stops.length - 1]?.color;
  return last ? toRgba(last) : toRgba(color);
}

/**
 * Extracts the two base colors of the current background: first and last stop.
 * If solid (or a single stop), B is derived by darkening A (-15% L,
 * same logic as the solid→gradient switch).
 */
export function extractTwoColors(css: string): { c1: string; c2: string } {
  const parsed = parseCssGradient(css);
  if (parsed && parsed.stops.length > 0) {
    const cols = parsed.stops.map((s) => toRgba(s.color));
    if (cols.length === 1) return { c1: cols[0], c2: darkened(cols[0]) };
    return { c1: cols[0], c2: cols[cols.length - 1] };
  }
  const solid = toRgba(css);
  return { c1: solid, c2: darkened(css) };
}

/** Serializes stops back to CSS: explicit position only when finite. */
function serializeStops(stops: { color: string; position: number }[]): string {
  return stops
    .map((s) =>
      Number.isFinite(s.position) ? `${s.color} ${s.position}%` : s.color,
    )
    .join(", ");
}

/**
 * Replaces the edge colors (first/last stop) while keeping the
 * current gradient structure (angle, positions, middle stops).
 * This way editing A/B never destroys a custom picker gradient.
 */
export function replaceEdgeColors(css: string, nC1: string, nC2: string): string {
  const parsed = parseCssGradient(css);
  if (!parsed || parsed.stops.length <= 1) {
    return GRADIENT_PATTERNS[0].build(nC1, nC2);
  }
  const stops = parsed.stops.map((s, i, arr) => ({
    color: i === 0 ? nC1 : i === arr.length - 1 ? nC2 : s.color,
    position: s.position,
  }));
  if (parsed.type === "radial") {
    return `radial-gradient(circle at center, ${serializeStops(stops)})`;
  }
  return `linear-gradient(${parsed.angle}deg, ${serializeStops(stops)})`;
}

export const GRADIENT_PATTERNS: GradientPattern[] = [
  {
    id: "diagonal",
    name: "Diagonal",
    hint: "135° ↘",
    description:
      "Icon standard: top-left light, adds energy without distraction.",
    android: 'angle="315"',
    build: (c1, c2) => `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
  },
  {
    id: "diagonal-alt",
    name: "Counter",
    hint: "45° ↙",
    description:
      "Opposite diagonal: same energy with inverted light. Useful for icon sets.",
    android: 'angle="45"',
    build: (c1, c2) => `linear-gradient(45deg, ${c1} 0%, ${c2} 100%)`,
  },
  {
    id: "vertical",
    name: "Vertical",
    hint: "180° ↓",
    description:
      "Top (A) to bottom (B). Elegant and tall; the eye reads B as a “shadow”.",
    android: 'angle="270"',
    build: (c1, c2) => `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`,
  },
  {
    id: "horizontal",
    name: "Side",
    hint: "90° →",
    description:
      "Left (A) to right (B). Calm and stable, works well on squircles.",
    android: 'angle="0"',
    build: (c1, c2) => `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`,
  },
  {
    id: "radial",
    name: "Glow",
    hint: "◎ center",
    description:
      "Centered radial A → B: light focus in the center, depth at the edges.",
    android: "radial · center 0.5",
    build: (c1, c2) =>
      `radial-gradient(circle at center, ${c1} 0%, ${c2} 100%)`,
  },
  {
    id: "halo",
    name: "Halo",
    hint: "◎ 45%",
    description:
      "A dominates up to 45% and blends into B at the edge. Ideal for highlighting the glyph.",
    android: "radial · center 0.5",
    build: (c1, c2) =>
      `radial-gradient(circle at center, ${c1} 0%, ${c1} 45%, ${c2} 100%)`,
  },
  {
    id: "trio",
    name: "Trio",
    hint: "135° + mid",
    description:
      "Three stops with a 50% A+B blend: smoother transition on large icons.",
    android: 'angle="315" + center',
    build: (c1, c2) =>
      `linear-gradient(135deg, ${c1} 0%, ${mixColors(c1, c2)} 50%, ${c2} 100%)`,
  },
  {
    id: "cut",
    name: "Cut",
    hint: "50% crisp",
    description:
      "Duo-tone with a hard 50% cut (4 stops). Simple geometric shapes only.",
    android: 'angle="315" · hard-stop',
    build: (c1, c2) =>
      `linear-gradient(135deg, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%)`,
  },
];

/** Normalizes CSS to compare templates (ignores whitespace/case). */
export function normCss(css: string): string {
  return css.replace(/\s+/g, "").toLowerCase();
}

/** Active template for a gradient, or null when it is custom. */
export function findActivePattern(css: string): GradientPattern | null {
  const { c1, c2 } = extractTwoColors(css);
  const norm = normCss(css);
  return (
    GRADIENT_PATTERNS.find((p) => normCss(p.build(c1, c2)) === norm) ?? null
  );
}

/**
 * Applies new base colors A/B honoring the active template: a template is
 * rebuilt from scratch (so Trio/Halo recompute their middle stops) while a
 * custom gradient only swaps its edge stops.
 */
export function applyTwoColors(css: string, c1: string, c2: string): string {
  const active = findActivePattern(css);
  return active ? active.build(c1, c2) : replaceEdgeColors(css, c1, c2);
}

/** "linear" | "radial" for a parseable gradient, null otherwise. */
export function getGradientType(css: string): "linear" | "radial" | null {
  return parseCssGradient(css)?.type ?? null;
}

/** Angle in degrees for a linear gradient, null for radial/unknown. */
export function getGradientAngle(css: string): number | null {
  const parsed = parseCssGradient(css);
  return parsed?.type === "linear" ? parsed.angle : null;
}

/** Rewrites the angle of a linear gradient, preserving type and stops. */
export function setGradientAngle(css: string, angleDeg: number): string {
  const parsed = parseCssGradient(css);
  if (!parsed || parsed.type !== "linear") return css;
  return `linear-gradient(${Math.round(angleDeg)}deg, ${serializeStops(parsed.stops)})`;
}

/**
 * Switches between linear and radial, preserving the color stops.
 * Linear always restarts from the icon-standard 135deg diagonal.
 */
export function setGradientType(
  css: string,
  type: "linear" | "radial",
): string {
  const parsed = parseCssGradient(css);
  if (!parsed || parsed.type === type) return css;
  if (type === "radial") {
    return `radial-gradient(circle at center, ${serializeStops(parsed.stops)})`;
  }
  return `linear-gradient(135deg, ${serializeStops(parsed.stops)})`;
}
