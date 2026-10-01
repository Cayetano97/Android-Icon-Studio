import type { IconConfig } from "@/types/icon";
import { renderToStaticMarkup } from "react-dom/server";
import { loadIcon, ensureIconsLoaded } from "@/lib/lucideIcons";
import {
  getCssGradientLine,
  interpolateStops,
  parseCssGradient,
} from "@/lib/canvasGradient";
import { cssColorToHex, sanitizeCssColor } from "@/lib/color";

export type RenderShape =
  | "circle"
  | "squircle"
  | "square"
  | "square-sharp"
  | "none";

export interface Effect {
  effect:
    | "fill-color"
    | "fill-lineargradient"
    | "fill-radialgradient"
    | "inner-shadow"
    | "outer-shadow"
    | "cast-shadow";
  color?: string;
  translateX?: number;
  translateY?: number;
  blur?: number;
  opacity?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  colors?: { offset: number; color: string }[];
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
}

export interface RenderOptions {
  assetSize: { w: number; h: number };
  contentSize?: { w: number; h: number };
  shape: RenderShape;
  layer?: "all" | "background" | "foreground";
  finalEffects?: Effect[];
  monochrome?: boolean;
  clipForeground?: boolean;
}

export interface Size {
  w: number;
  h: number;
}

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return c;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height);
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}

export function getShapePath(shape: RenderShape, w: number, h: number): Path2D {
  const path = new Path2D();
  if (shape === "circle") {
    path.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === "squircle") {
    // Superellipse approximation (matches IconKitchen, u = 0.1)
    const u = 0.1;
    path.moveTo(w / 2, 0);
    path.bezierCurveTo(w - u * w, 0, w, u * h, w, h / 2);
    path.bezierCurveTo(w, h - u * h, w - u * w, h, w / 2, h);
    path.bezierCurveTo(u * w, h, 0, h - u * h, 0, h / 2);
    path.bezierCurveTo(0, u * h, u * w, 0, w / 2, 0);
    path.closePath();
  } else if (shape === "square") {
    path.roundRect(0, 0, w, h, (3 / 48) * Math.min(w, h));
  } else {
    // square-sharp / none
    path.rect(0, 0, w, h);
  }
  return path;
}

const supportsCanvasFilter = (() => {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  return ctx ? "filter" in ctx : false;
})();

function applyShadows(
  effects: Effect[],
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  size: Size,
) {
  const shadowEffects = effects.filter(
    (e) => e.effect === "cast-shadow" || e.effect === "outer-shadow",
  );
  if (shadowEffects.length === 0) return;

  const blur = shadowEffects.reduce(
    (m, e) => Math.max(m, e.blur ?? 0),
    0,
  );
  const margin = blur;
  const ext = createCanvas(size.w + margin * 2, size.h + margin * 2);
  const extCtx = ext.getContext("2d")!;

  for (const e of shadowEffects) {
    extCtx.clearRect(0, 0, ext.width, ext.height);
    extCtx.save();
    const dx = margin + (e.translateX ?? 0);
    const dy = margin + (e.translateY ?? 0);
    const color = e.color ?? "#000";
    if (e.effect === "cast-shadow") {
      extCtx.filter = `blur(${e.blur ?? 0}px)`;
      extCtx.drawImage(source, dx, dy);
      extCtx.filter = "none";
    } else {
      if (supportsCanvasFilter) {
        extCtx.filter = `blur(${e.blur ?? 0}px)`;
        extCtx.drawImage(source, dx, dy);
        extCtx.filter = "none";
        extCtx.globalCompositeOperation = "source-atop";
        extCtx.fillStyle = color;
        extCtx.fillRect(0, 0, ext.width, ext.height);
      } else {
        // Fallback: shadowBlur hack (matches IconKitchen fallback)
        extCtx.shadowOffsetX = ext.width;
        extCtx.shadowOffsetY = 0;
        extCtx.shadowColor = color;
        extCtx.shadowBlur = (e.blur ?? 0) * 2;
        extCtx.drawImage(source, dx - ext.width, dy);
        extCtx.shadowOffsetX = 0;
        extCtx.shadowBlur = 0;
      }
    }
    extCtx.restore();
    const targetCtx = target.getContext("2d")!;
    targetCtx.globalAlpha = e.opacity ?? 1;
    // ext paints the shadow at (margin + translateX, margin + translateY),
    // so sampling from (margin, margin) places it at (translateX, translateY).
    targetCtx.drawImage(
      ext,
      margin,
      margin,
      size.w,
      size.h,
      0,
      0,
      size.w,
      size.h,
    );
    targetCtx.globalAlpha = 1;
  }
}

function applyFills(
  effects: Effect[],
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  size: Size,
) {
  const fills = effects.filter(
    (e) =>
      e.effect === "fill-color" ||
      e.effect === "fill-lineargradient" ||
      e.effect === "fill-radialgradient",
  );
  if (fills.length === 0) return;

  let opacity = 1;
  const tmp = cloneCanvas(source);
  const ctx = tmp.getContext("2d")!;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  for (const e of fills) {
    opacity = e.opacity ?? opacity;
    if (e.effect === "fill-color") {
      ctx.fillStyle = e.color ?? "#000";
    } else if (e.effect === "fill-lineargradient") {
      const grad = ctx.createLinearGradient(
        e.fromX ?? 0,
        e.fromY ?? 0,
        e.toX ?? size.w,
        e.toY ?? size.h,
      );
      (e.colors ?? []).forEach(({ offset, color }) => {
        try {
          grad.addColorStop(offset, sanitizeCssColor(color));
        } catch {
          // ignore invalid color stops instead of failing the whole render
        }
      });
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(
        e.centerX ?? size.w / 2,
        e.centerY ?? size.h / 2,
        0,
        e.centerX ?? size.w / 2,
        e.centerY ?? size.h / 2,
        e.radius ?? size.w / 2,
      );
      (e.colors ?? []).forEach(({ offset, color }) => {
        try {
          grad.addColorStop(offset, sanitizeCssColor(color));
        } catch {
          // ignore invalid color stops instead of failing the whole render
        }
      });
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, size.w, size.h);
  }
  ctx.restore();

  const targetCtx = target.getContext("2d")!;
  targetCtx.save();
  targetCtx.globalAlpha = opacity;
  targetCtx.drawImage(tmp, 0, 0);
  targetCtx.restore();
}

function applyInnerShadows(
  effects: Effect[],
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  size: Size,
) {
  const inner = effects.filter((e) => e.effect === "inner-shadow");
  if (inner.length === 0) return;

  let work = cloneCanvas(source);
  for (const e of inner) {
    const blur = e.blur ?? 0;
    const dx = e.translateX ?? 0;
    const dy = e.translateY ?? 0;
    const m = blur + Math.max(Math.abs(dx), Math.abs(dy));
    const ext = createCanvas(size.w + m * 2, size.h + m * 2);
    const extCtx = ext.getContext("2d")!;
    extCtx.save();
    if (supportsCanvasFilter) {
      extCtx.filter = `blur(${blur}px)`;
      extCtx.drawImage(work, m + dx, m + dy);
      extCtx.filter = "none";
    } else {
      extCtx.shadowOffsetX = ext.width;
      extCtx.shadowOffsetY = 0;
      extCtx.shadowColor = "#000";
      extCtx.shadowBlur = blur * 2;
      extCtx.drawImage(work, m + dx - ext.width, m + dy);
      extCtx.shadowOffsetX = 0;
      extCtx.shadowBlur = 0;
    }
    extCtx.globalCompositeOperation = "source-out";
    extCtx.fillStyle = e.color ?? "#000";
    extCtx.fillRect(0, 0, ext.width, ext.height);
    extCtx.restore();

    // Composite the ring over a clone of `work`: source-atop keeps it inside
    // the current alpha (compositing into an empty canvas would drop it).
    const next = cloneCanvas(work);
    const ctx = next.getContext("2d")!;
    ctx.globalCompositeOperation = "source-atop";
    ctx.drawImage(ext, m, m, size.w, size.h, 0, 0, size.w, size.h);
    work = next;
  }

  const targetCtx = target.getContext("2d")!;
  targetCtx.globalCompositeOperation = "source-atop";
  targetCtx.drawImage(work, 0, 0);
  targetCtx.globalCompositeOperation = "source-over";
}

export function applyEffects(
  source: HTMLCanvasElement,
  effects: Effect[],
  size: Size,
): HTMLCanvasElement {
  if (!effects || effects.length === 0) return cloneCanvas(source);
  const out = createCanvas(size.w, size.h);
  applyShadows(effects, source, out, size);
  applyFills(effects, source, out, size);
  applyInnerShadows(effects, source, out, size);
  return out;
}

// ---------------------------------------------------------------------------
// Foreground generation (clipart / text / image)
// ---------------------------------------------------------------------------

const clipartCache = new Map<string, Promise<HTMLImageElement>>();

function loadClipartImage(
  name: string,
  targetSize: number,
): Promise<HTMLImageElement> {
  const bucket = targetSize <= 256 ? 256 : targetSize <= 512 ? 512 : 1024;
  const key = `${name}@${bucket}`;
  let cached = clipartCache.get(key);
  if (!cached) {
    cached = (async () => {
      await ensureIconsLoaded();
      const Icon = loadIcon(name);
      if (!Icon) {
        throw new Error(`Icon not found: ${name}`);
      }
      const svgMarkup = renderToStaticMarkup(
        <Icon size={bucket} color="#000000" strokeWidth={1.5} />,
      );
      const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
      return img;
    })().catch((err) => {
      // Drop failed loads so a later attempt can retry.
      clipartCache.delete(key);
      throw err;
    });
    clipartCache.set(key, cached);
    // Bounded LRU: evict the oldest entry beyond the cap.
    if (clipartCache.size > 24) {
      const oldest = clipartCache.keys().next().value;
      if (oldest) clipartCache.delete(oldest);
    }
  }
  return cached;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFont(fontFamily: string, fontWeight: number) {
  try {
    await document.fonts.load(`${fontWeight} 16px "${fontFamily}"`);
  } catch {
    // ignore font load errors, fall back to sans-serif
  }
}

export interface ForegroundSource {
  kind: "clipart" | "text" | "image";
  canvas: HTMLCanvasElement;
}

/**
 * Renders the foreground (clipart/text/image) to its own canvas sized `size`.
 */
export async function renderForeground(
  config: IconConfig,
  size: Size,
  monochrome = false,
): Promise<ForegroundSource | null> {
  const fgColor = monochrome
    ? sanitizeCssColor(config.monochromeColor)
    : cssColorToHex(config.foregroundColor);
  const canvas = createCanvas(size.w, size.h);
  const ctx = canvas.getContext("2d")!;

  if (config.source === "clipart") {
    const img = await loadClipartImage(config.clipartName, size.w);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(img, 0, 0, size.w, size.h);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = fgColor;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.globalCompositeOperation = "source-over";
    return { kind: "clipart", canvas };
  }

  if (config.source === "text") {
    await loadFont(config.fontFamily, config.fontWeight);
    const text = (config.text ?? "").trim();
    if (!text) {
      // Nothing to draw: leave the canvas transparent.
      return { kind: "text", canvas };
    }
    let fontHeight = Math.floor(size.h * 0.75);
    const buildFont = (h: number) =>
      `${config.fontWeight} ${h}px "${config.fontFamily}", sans-serif`;
    ctx.font = buildFont(fontHeight);
    const measured = ctx.measureText(text).width;
    if (measured > size.w * 0.94 && measured > 0) {
      fontHeight = Math.floor((fontHeight * (size.w * 0.94)) / measured);
      ctx.font = buildFont(fontHeight);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fgColor;
    ctx.fillText(text, size.w / 2, size.h / 2);
    return { kind: "text", canvas };
  }

  if (config.source === "image" && config.imageDataUrl) {
    const img = await loadImage(config.imageDataUrl);
    // Contain the image inside the box without distortion (matches
    // IconKitchen's default "center" scaling).
    const scale = Math.min(size.w / img.naturalWidth, size.h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(img, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
    return { kind: "image", canvas };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main icon renderer (mirrors IconKitchen's $t render engine)
// ---------------------------------------------------------------------------

function getBackgroundFill(
  config: IconConfig,
  ctx: CanvasRenderingContext2D,
  spanW: number,
  spanH: number,
): string | CanvasGradient {
  const bg = config.background;
  const parsed = parseCssGradient(bg);
  if (!parsed) {
    return cssColorToHex(bg);
  }

  const applyStops = (grad: CanvasGradient) => {
    interpolateStops(parsed.stops).forEach((stop) => {
      if (!isNaN(stop.position)) {
        try {
          grad.addColorStop(stop.position / 100, sanitizeCssColor(stop.color));
        } catch {
          // ignore invalid color stops instead of failing the whole render
        }
      }
    });
  };

  if (parsed.type === "linear") {
    // CSS gradient-line geometry (same as SVG/VectorDrawable exports).
    const line = getCssGradientLine(parsed.angle, spanW, spanH);
    const grad = ctx.createLinearGradient(line.x1, line.y1, line.x2, line.y2);
    applyStops(grad);
    return grad;
  }

  // CSS radial-gradient defaults to farthest-corner.
  const grad = ctx.createRadialGradient(
    spanW / 2,
    spanH / 2,
    0,
    spanW / 2,
    spanH / 2,
    Math.hypot(spanW / 2, spanH / 2),
  );
  applyStops(grad);
  return grad;
}

export interface RenderedIcon {
  canvas: HTMLCanvasElement;
  toDataURL(): string;
}

/**
 * Renders the icon with IconKitchen-grade quality: vector paths are drawn
 * directly at the target density (no supersampling loss), gradients are
 * computed over the content-size box, and optional final effects (gloss /
 * shadows) are applied for legacy outputs.
 */
export async function renderIcon(
  config: IconConfig,
  opts: RenderOptions,
): Promise<RenderedIcon> {
  const {
    assetSize: asset,
    shape,
    layer = "all",
    monochrome = false,
  } = opts;
  const contentSize = opts.contentSize ?? asset;
  const canvas = createCanvas(asset.w, asset.h);
  const ctx = canvas.getContext("2d")!;

  const box = {
    x: (asset.w - contentSize.w) / 2,
    y: (asset.h - contentSize.h) / 2,
    ...contentSize,
  };

  // Background layer
  if (layer === "all" || layer === "background") {
    ctx.save();
    if (layer === "background") {
      // Covers the full asset (IconKitchen: b.scale(o.w, o.h))
      const path = getShapePath(shape, asset.w, asset.h);
      ctx.fillStyle = getBackgroundFill(config, ctx, asset.w, asset.h);
      ctx.fill(path);
    } else {
      // Shape lives inside the content-size box (IconKitchen: translate+scale A)
      const path = getShapePath(shape, box.w, box.h);
      ctx.translate(box.x, box.y);
      ctx.fillStyle = getBackgroundFill(
        config,
        ctx,
        contentSize.w,
        contentSize.h,
      );
      ctx.fill(path);
    }
    ctx.restore();
  }

  // Foreground layer
  if (layer === "all" || layer === "foreground") {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.w / asset.w, box.h / asset.h);

    const pad = (config.padding / 100) * contentSize.w;
    const inner = contentSize.w - pad * 2;

    const fg = await renderForeground(config, { w: inner, h: inner }, monochrome);
    if (fg) {
      // Foreground transforms (scale / offset / rotation) around the center
      const cx = contentSize.w / 2;
      const cy = contentSize.h / 2;
      const offsetX = (config.foregroundOffsetX / 100) * contentSize.w;
      const offsetY = (config.foregroundOffsetY / 100) * contentSize.h;
      const rotation = (config.foregroundRotation * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx + offsetX, cy + offsetY);
      ctx.rotate(rotation);
      ctx.scale(config.foregroundScale, config.foregroundScale);
      ctx.translate(-cx, -cy);

      if (config.source === "clipart") {
        // Tint already applied in renderForeground
        ctx.drawImage(fg.canvas, pad, pad, inner, inner);
      } else if (config.source === "image") {
        ctx.drawImage(fg.canvas, pad, pad, inner, inner);
      } else if (config.source === "text") {
        ctx.drawImage(fg.canvas, pad, pad, inner, inner);
      }
      ctx.restore();
    }

    ctx.restore();

    // Mask the finished layer to the icon shape (legacy / round PNG exports).
    if (fg && opts.clipForeground) {
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fill(getShapePath(shape, box.w, box.h));
      ctx.restore();
    }
  }

  const finalEffects = monochrome ? undefined : opts.finalEffects;
  const result = finalEffects
    ? applyEffects(canvas, finalEffects, asset)
    : canvas;

  return {
    canvas: result,
    toDataURL: () => result.toDataURL("image/png"),
  };
}
