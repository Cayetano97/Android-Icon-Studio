import { parseCssGradient } from "@/lib/canvasGradient";
import { parseCssColorToRgba } from "@/lib/color";

/**
 * Gradient system: *application* templates (how the gradient is
 * distributed) live in `lib/gradientPatterns.ts` as
 * `(colorA, colorB) => css` functions. Only the
 * CSS → Android conversion remains here, using the same parser as the
 * canvas preview and the SVG/VectorDrawable export.
 *
 * References:
 * - CSS: `linear-gradient(<angle>deg, <stop> <pos>, ...)` /
 *   `radial-gradient(circle at center, ...)` (MDN).
 * - Android GradientDrawable: `android:angle` in 45-degree steps only
 *   (0 = left→right, 90 = bottom→top), `type` linear|radial|sweep.
 */

// ---------------------------------------------------------------------------
// CSS → Android conversion
// ---------------------------------------------------------------------------

function rgbaToAndroidHex(color: string): string {
  const { r, g, b, a } = parseCssColorToRgba(color);
  const h = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  const alpha = Math.round(a * 255);
  // Android uses #AARRGGBB when alpha < 1, otherwise #RRGGBB
  return alpha >= 255
    ? `#${h(r)}${h(g)}${h(b)}`
    : `#${h(alpha)}${h(r)}${h(g)}${h(b)}`;
}

/**
 * CSS measures 0deg = up (bottom→top), 90deg = right.
 * Android measures 0 = left→right, 90 = bottom→top.
 * Conversion: android = (450 - css) % 360, rounded to a 45-degree step.
 * Reference: developer.android.com → GradientDrawable `android:angle`.
 */
export function cssAngleToAndroidAngle(cssDeg: number): number {
  const raw = ((450 - cssDeg) % 360 + 360) % 360;
  return Math.round(raw / 45) * 45 % 360;
}

export interface AndroidGradient {
  type: "linear" | "radial" | "sweep";
  angle: number;
  startColor: string;
  centerColor?: string;
  endColor: string;
  /** All stops as items (for API 24+ VectorDrawable with N stops) */
  items: { offset: number; color: string }[];
}

/** Extracts start/center/end + Android angle from a CSS gradient. */
export function cssGradientToAndroid(css: string): AndroidGradient | null {
  const parsed = parseCssGradient(css);
  if (!parsed) return null;
  const stops = parsed.stops
    .map((s, i, arr) => ({
      color: rgbaToAndroidHex(s.color),
      offset: Number.isFinite(s.position)
        ? s.position / 100
        : arr.length === 1
          ? 0
          : i / (arr.length - 1),
    }))
    .sort((a, b) => a.offset - b.offset);
  if (stops.length === 0) return null;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const mid = stops.length === 3
    ? stops[1].color
    : stops.length > 3
      ? undefined
      : stops.length === 2
        ? undefined
        : first.color;
  return {
    type: parsed.type === "radial" ? "radial" : "linear",
    angle: parsed.type === "linear" ? cssAngleToAndroidAngle(parsed.angle) : 0,
    startColor: first.color,
    centerColor: stops.length === 3 ? mid : undefined,
    endColor: last.color,
    items: stops,
  };
}
