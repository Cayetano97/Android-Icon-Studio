export interface ParsedGradient {
  type: "linear" | "radial";
  angle: number;
  stops: { color: string; position: number }[];
}

export function parseCssGradient(css: string): ParsedGradient | null {
  const typeMatch = css.match(/^(linear|radial)-gradient/);
  if (!typeMatch) return null;
  const type = typeMatch[1] as "linear" | "radial";

  const innerMatch = css.match(/-gradient\(((?:[^()]+|\([^()]*\))*)\)$/);
  if (!innerMatch) return null;

  const inner = innerMatch[1];
  const parts = inner.split(/,(?![^\(]*\))/).map((x) => x.trim());
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

  const stops = stopsList.map((stop) => {
    const sp = stop.split(" ");
    const posStr = sp.pop() || "";
    const pos = parseFloat(posStr);
    const color = sp.join(" ");
    return { color, position: posStr.includes("%") ? pos : NaN };
  });

  return { type, angle, stops };
}

export function applyCanvasBackground(
  ctx: CanvasRenderingContext2D,
  background: string,
  width: number,
  height: number,
) {
  const parsed = parseCssGradient(background);

  if (!parsed) {
    ctx.fillStyle = background;
    return;
  }

  let grad: CanvasGradient;
  if (parsed.type === "linear") {
    const angleRad = (parsed.angle - 90) * (Math.PI / 180);
    const hw = width / 2;
    const hh = height / 2;
    const distance = Math.sqrt(hw * hw + hh * hh);
    const x1 = hw + Math.cos(angleRad) * distance;
    const y1 = hh + Math.sin(angleRad) * distance;
    const x2 = hw - Math.cos(angleRad) * distance;
    const y2 = hh - Math.sin(angleRad) * distance;
    grad = ctx.createLinearGradient(x2, y2, x1, y1);
  } else {
    const hw = width / 2;
    const hh = height / 2;
    grad = ctx.createRadialGradient(hw, hh, 0, hw, hh, Math.max(hw, hh));
  }

  parsed.stops.forEach((stop) => {
    if (!isNaN(stop.position)) {
      try {
        grad.addColorStop(stop.position / 100, stop.color);
      } catch (_) { /* ignore invalid stops */ }
    }
  });

  ctx.fillStyle = grad;
}
