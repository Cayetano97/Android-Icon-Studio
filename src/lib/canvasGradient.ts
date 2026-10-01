export interface ParsedGradient {
  type: "linear" | "radial";
  angle: number;
  stops: { color: string; position: number }[];
}

export function parseCssGradient(css: string): ParsedGradient | null {
  const typeMatch = css.match(/^(linear|radial)-gradient/);
  if (!typeMatch) return null;
  const type = typeMatch[1] as "linear" | "radial";

  const innerMatch = css.match(/-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)$/);
  if (!innerMatch) return null;

  const inner = innerMatch[1];
  const parts = inner.split(/,(?![^()]*\))/).map((x) => x.trim());
  let angle = 180;
  let stopsList = parts;

  if (type === "linear") {
    const first = parts[0];
    if (first.includes("deg")) {
      angle = parseFloat(first) || 0;
      stopsList = parts.slice(1);
    } else if (first.includes("to ")) {
      const dir = first.trim();
      const dirMap: Record<string, number> = {
        "to top": 0, "to right": 90, "to bottom": 180, "to left": 270,
        "to top right": 45, "to bottom right": 135,
        "to bottom left": 225, "to top left": 315,
      };
      angle = dirMap[dir] ?? 180;
      stopsList = parts.slice(1);
    }
  }

  if (type === "radial") {
    // CSS radial preludes ("circle at 50% 50%", "ellipse", "closest-side at …")
    // are not color stops — drop the prelude before parsing stops.
    const first = parts[0] ?? "";
    if (
      /^(circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner)\b/.test(
        first,
      ) ||
      /\bat\b/.test(first)
    ) {
      stopsList = parts.slice(1);
    }
  }

  const stops = stopsList.map((stop) => {
    // Optional position is the LAST token only when it ends with "%".
    const m = stop.match(/^(.*?)\s+(-?[\d.]+)%\s*$/);
    if (m) return { color: m[1].trim(), position: parseFloat(m[2]) };
    return { color: stop.trim(), position: NaN };
  });

  return { type, angle, stops };
}

/**
 * CSS gradient line: length is |w·sinA| + |h·cosA|, direction points toward
 * the end of the gradient (MDN). 0deg = bottom→top, 180deg = top→bottom.
 */
export function getCssGradientLine(
  angleDeg: number,
  w: number,
  h: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    x1: cx - (dx * len) / 2,
    y1: cy - (dy * len) / 2,
    x2: cx + (dx * len) / 2,
    y2: cy + (dy * len) / 2,
  };
}

/**
 * Fills in CSS gradient stop positions that were omitted: missing positions
 * are interpolated between their neighbours, and open edges fall back to
 * 0 / 100. Guarantees finite positions so downstream NaN guards never drop a
 * stop (which used to leave gradients with no stops at all).
 */
export function interpolateStops(
  stops: { color: string; position: number }[],
): { color: string; position: number }[] {
  if (stops.length === 0) return stops;
  const result = stops.map((s) => ({ ...s }));
  const known = result
    .map((s, i) => ({ i, p: s.position }))
    .filter(({ p }) => Number.isFinite(p));
  if (known.length === 0) {
    return result.map((s, i) => ({
      ...s,
      position: result.length === 1 ? 0 : (i / (result.length - 1)) * 100,
    }));
  }
  // Open edges default to the gradient start / end.
  if (!Number.isFinite(result[0].position)) result[0].position = 0;
  if (!Number.isFinite(result[result.length - 1].position)) {
    result[result.length - 1].position = 100;
  }
  // Interpolate runs of unknown positions between known neighbours.
  let prevIdx = 0;
  for (let i = 0; i <= result.length; i++) {
    const isEdge = i === result.length;
    const isKnown = !isEdge && Number.isFinite(result[i].position);
    if (isEdge || isKnown) {
      const start = result[prevIdx];
      const end = isEdge ? { position: 100 } : result[i];
      const steps = i - prevIdx;
      for (let j = prevIdx + 1; j < i; j++) {
        result[j].position =
          start.position + ((end.position - start.position) * (j - prevIdx)) / steps;
      }
      prevIdx = i;
    }
  }
  return result;
}
