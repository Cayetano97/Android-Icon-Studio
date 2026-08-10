import { IconConfig } from "@/types/icon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { parseCssGradient } from "@/lib/canvasGradient";
import {
  cssColorToHex,
  parseCssColorToRgba,
  extractFirstColor,
} from "@/lib/color";
import {
  extractPathsFromSvg,
  extractLucideVectorPaths,
  getShapeSvgClip,
  getShapeSvgPath,
} from "@/lib/svgPathUtils";
import { androidSizes } from "@/lib/constants";

const SUPERSAMPLE_FACTOR_DENSITY = 4;
const SUPERSAMPLE_FACTOR_PLAY = 2;

function svgSafeColor(color: string): string {
  return cssColorToHex(color);
}

function svgColor(color: string): { color: string; opacity: number } {
  const m = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/,
  );
  if (m) {
    const r = parseInt(m[1]);
    const g = parseInt(m[2]);
    const b = parseInt(m[3]);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return { color: hex, opacity: a };
  }
  const hex = cssColorToHex(color);
  return { color: hex, opacity: 1 };
}

function loadImageFromSvg(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createHighQualityCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return c;
}

function buildSvgGradientDef(
  config: IconConfig,
  size: number,
): { defs: string; fillRef: string } {
  const bg = config.background;
  if (!bg.includes("linear-gradient") && !bg.includes("radial-gradient")) {
    return { defs: "", fillRef: svgSafeColor(bg) };
  }

  const parsed = parseCssGradient(bg);
  if (!parsed) {
    return { defs: "", fillRef: svgSafeColor(bg) };
  }

  const hw = size / 2;
  const hh = size / 2;

  const totalStops = parsed.stops.length;
  const formatStop = (
    stop: { color: string; position: number },
    index: number,
  ) => {
    let pos = stop.position;
    if (!Number.isFinite(pos)) {
      pos = totalStops === 1 ? 0 : (index / (totalStops - 1)) * 100;
    }
    const { color, opacity } = svgColor(stop.color);
    const opacityAttr = opacity < 1 ? ` stop-opacity="${opacity}"` : "";
    return `    <stop offset="${pos}%" stop-color="${color}"${opacityAttr}/>`;
  };

  if (parsed.type === "linear") {
    const angleRad = (parsed.angle - 90) * (Math.PI / 180);
    const distance = Math.sqrt(hw * hw + hh * hh);
    const x1 = Math.round(hw + Math.cos(angleRad) * distance);
    const y1 = Math.round(hh + Math.sin(angleRad) * distance);
    const x2 = Math.round(hw - Math.cos(angleRad) * distance);
    const y2 = Math.round(hh - Math.sin(angleRad) * distance);

    const stopTags = parsed.stops.map(formatStop).join("\n");
    const defs = `<linearGradient id="bgGrad" gradientUnits="userSpaceOnUse" x1="${x2}" y1="${y2}" x2="${x1}" y2="${y1}">\n${stopTags}\n  </linearGradient>`;
    return { defs, fillRef: "url(#bgGrad)" };
  }

  const stopTags = parsed.stops.map(formatStop).join("\n");
  const defs = `<radialGradient id="bgGrad" gradientUnits="userSpaceOnUse" cx="${hw}" cy="${hh}" r="${Math.max(hw, hh)}">\n${stopTags}\n  </radialGradient>`;
  return { defs, fillRef: "url(#bgGrad)" };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchFontAsBase64(
  fontFamily: string,
  fontWeight: number,
): Promise<string | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${fontWeight}&display=swap`;
    const cssResp = await fetch(cssUrl);
    if (!cssResp.ok) return null;
    const cssText = await cssResp.text();

    const woff2Match = cssText.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!woff2Match) return null;

    const fontResp = await fetch(woff2Match[1]);
    if (!fontResp.ok) return null;
    const fontBuffer = await fontResp.arrayBuffer();

    const bytes = new Uint8Array(fontBuffer);
    const CHUNK_SIZE = 32768;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    const base64 = btoa(binary);

    return `@font-face {\n      font-family: '${fontFamily}';\n      font-weight: ${fontWeight};\n      src: url(data:font/woff2;base64,${base64}) format('woff2');\n    }`;
  } catch {
    return null;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      type,
      quality,
    );
  });
}

function renderCanvasAtSize(
  source: HTMLCanvasElement,
  targetSize: number,
): HTMLCanvasElement {
  const c = createHighQualityCanvas(targetSize, targetSize);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, targetSize, targetSize);
  return c;
}

function renderRoundCanvas(
  source: HTMLCanvasElement,
  targetSize: number,
): HTMLCanvasElement {
  const c = createHighQualityCanvas(targetSize, targetSize);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.beginPath();
  ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(source, 0, 0, targetSize, targetSize);
  return c;
}

export function generateSvg(
  config: IconConfig,
  size: number = 512,
  foregroundDataUrl?: string,
  iconSvgMarkup?: string,
  embeddedFont?: string | null,
): string {
  const padding = (config.padding / 100) * size;
  const innerSize = size - padding * 2;
  const { defs: gradientDef, fillRef } = buildSvgGradientDef(config, size);
  const clipDef = getShapeSvgClip(config.shape, size);

  const defsParts: string[] = [];
  if (gradientDef) defsParts.push(gradientDef);
  if (clipDef) defsParts.push(clipDef);

  if (embeddedFont) {
    defsParts.push(`<style>${embeddedFont}</style>`);
  }

  const defsBlock =
    defsParts.length > 0 ? `<defs>\n${defsParts.join("\n")}\n</defs>` : "";

  let foregroundContent = "";

  if (config.source === "text") {
    const yOffset = config.fontFamily === "Bebas Neue" ? 4 : 0;
    const fgColor = svgSafeColor(config.foregroundColor);
    foregroundContent = `<text x="${size / 2}" y="${size / 2 + yOffset}" fill="${fgColor}" font-family="'${config.fontFamily}', sans-serif" font-weight="${config.fontWeight}" font-size="${innerSize * 0.5}" text-anchor="middle" dominant-baseline="central" text-rendering="optimizeLegibility">${escapeXml(config.text)}</text>`;
  } else if (config.source === "clipart" && iconSvgMarkup) {
    const vectorPaths = extractLucideVectorPaths(
      iconSvgMarkup,
      padding,
      padding,
      innerSize,
    );
    if (vectorPaths) {
      foregroundContent = vectorPaths;
    } else if (foregroundDataUrl) {
      foregroundContent = `<image href="${foregroundDataUrl}" x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" image-rendering="optimizeQuality"/>`;
    }
  } else if (config.source === "image" && foregroundDataUrl) {
    foregroundContent = `<image href="${foregroundDataUrl}" x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" image-rendering="optimizeQuality"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">
${defsBlock}
<g clip-path="url(#shape)">
  ${getShapeSvgPath(config.shape, size)} fill="${fillRef}"/>
  ${foregroundContent}
</g>
</svg>`;
}

export function generateAndroidVectorDrawable(
  config: IconConfig,
  size: number = 24,
  iconSvg?: string,
): string {
  const viewportSize = 512;
  const padding = (config.padding / 100) * viewportSize;
  const innerSize = viewportSize - padding * 2;

  let pathData = "";

  if (config.source === "clipart" && iconSvg) {
    pathData = extractPathsFromSvg(iconSvg, padding, innerSize);
  } else if (config.source === "text") {
    pathData = `    <path
        android:pathData="M${padding},${padding}h${innerSize}v${innerSize}h-${innerSize}z"
        android:fillColor="${config.foregroundColor}"/>
    <!-- Note: Text icons should be replaced with actual vector paths for production -->`;
  }

  let bgPath = "";
  if (config.shape === "circle") {
    const r = viewportSize / 2;
    bgPath = `M${r},0A${r},${r},0,1,1,${r},${viewportSize}A${r},${r},0,1,1,${r},0Z`;
  } else if (config.shape === "square") {
    const rad = viewportSize * 0.08;
    bgPath = `M${rad},0L${viewportSize - rad},0Q${viewportSize},0,${viewportSize},${rad}L${viewportSize},${viewportSize - rad}Q${viewportSize},${viewportSize},${viewportSize - rad},${viewportSize}L${rad},${viewportSize}Q0,${viewportSize},0,${viewportSize - rad}L0,${rad}Q0,0,${rad},0Z`;
  } else if (config.shape === "squircle") {
    const rad = viewportSize * 0.22;
    bgPath = `M${rad},0L${viewportSize - rad},0Q${viewportSize},0,${viewportSize},${rad}L${viewportSize},${viewportSize - rad}Q${viewportSize},${viewportSize},${viewportSize - rad},${viewportSize}L${rad},${viewportSize}Q0,${viewportSize},0,${viewportSize - rad}L0,${rad}Q0,0,${rad},0Z`;
  } else {
    bgPath = `M0,0L${viewportSize},0L${viewportSize},${viewportSize}L0,${viewportSize}Z`;
  }

  const bg = config.background;
  const isGradient = bg.includes("-gradient");
  let bgFill = bg;
  let gradientComment = "";

  if (isGradient) {
    const innerMatch = bg.match(/-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)$/);
    if (innerMatch) {
      const parts = innerMatch[1]
        .split(/,(?![^()]*\))/)
        .map((x) => x.trim());
      const firstStop = parts.find(
        (p) => p.startsWith("rgb") || p.startsWith("#"),
      );
      if (firstStop) {
        bgFill = firstStop.split(" ").slice(0, -1).join(" ");
        if (!bgFill) bgFill = firstStop;
      }
      gradientComment = `\n    <!-- Gradient defined by background css: ${bg}. For API 24+ use <gradient> tag instead. -->`;
    }
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${size}dp"
    android:height="${size}dp"
    android:viewportWidth="${viewportSize}"
    android:viewportHeight="${viewportSize}">${gradientComment}
    <path
        android:pathData="${bgPath}"
        android:fillColor="${bgFill}"/>
${pathData}
</vector>`;
}

function buildAdaptiveForegroundXml(
  config: IconConfig,
  iconSvg?: string,
): string {
  const viewportSize = 108;
  const contentSize = 72;
  const offset = (viewportSize - contentSize) / 2;
  const centerX = viewportSize / 2;
  const centerY = viewportSize / 2;

  const offsetX = (config.foregroundOffsetX / 100) * contentSize;
  const offsetY = (config.foregroundOffsetY / 100) * contentSize;
  const scale = config.foregroundScale;
  const rotation = config.foregroundRotation;

  let content = "";

  if (config.source === "text") {
    const fgColor = svgSafeColor(config.foregroundColor);
    content = `    <group
        android:pivotX="${centerX}"
        android:pivotY="${centerY}"
        android:translateX="${offsetX}"
        android:translateY="${offsetY}"
        android:scaleX="${scale}"
        android:scaleY="${scale}"
        android:rotation="${rotation}">
      <path
          android:pathData="M${centerX - contentSize * 0.25},${centerY}h${contentSize * 0.5}v${contentSize * 0.5}h-${contentSize * 0.5}z"
          android:fillColor="${fgColor}"/>
    </group>`;
  } else if (config.source === "clipart" && iconSvg) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(iconSvg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (svgEl) {
      const viewBox = svgEl.getAttribute("viewBox");
      let vbW = 24;
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4) {
          vbW = parts[2];
        }
      }

      const svgScale = contentSize / vbW;
      const groupAttrs = `android:pivotX="${centerX}" android:pivotY="${centerY}" android:translateX="${offsetX + offset}" android:translateY="${offsetY + offset}" android:scaleX="${scale * svgScale}" android:scaleY="${scale * svgScale}" android:rotation="${rotation}"`;

      const parts: string[] = [];
      const walk = (el: Element) => {
        const tag = el.tagName.toLowerCase();
        if (tag === "svg" || tag === "defs" || tag === "title") {
          for (const child of Array.from(el.children)) walk(child);
          return;
        }
        if (tag === "path") {
          const d = el.getAttribute("d");
          const fill = el.getAttribute("fill") ?? config.foregroundColor;
          if (d)
            parts.push(
              `      <path android:pathData="${d}" android:fillColor="${fill}"/>`,
            );
        } else if (tag === "g") {
          for (const child of Array.from(el.children)) walk(child);
        }
      };
      for (const child of Array.from(svgEl.children)) walk(child);

      if (parts.length > 0) {
        content = `    <group\n        ${groupAttrs}>\n${parts.join("\n")}\n    </group>`;
      }
    }
  }

  if (!content) {
    content = `    <group
        android:pivotX="${centerX}"
        android:pivotY="${centerY}"
        android:translateX="${offsetX}"
        android:translateY="${offsetY}"
        android:scaleX="${scale}"
        android:scaleY="${scale}"
        android:rotation="${rotation}">
    </group>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
${content}
</vector>`;
}

function buildAdaptiveBackgroundXml(config: IconConfig): string {
  const bg = config.background;

  if (!bg.includes("gradient")) {
    const { r, g, b } = parseCssColorToRgba(bg);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:fillColor="${hex}"/>
</shape>`;
  }

  const parsed = parseCssGradient(bg);
  if (!parsed || parsed.type !== "linear") {
    const firstColor = extractFirstColor(bg);
    const { r, g, b } = parseCssColorToRgba(firstColor);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:fillColor="${hex}"/>
</shape>`;
  }

  const angle = parsed.angle;

  return `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:shape="rectangle">
    <gradient
        android:type="linear"
        android:angle="${angle}"
        android:startColor="${svgColor(parsed.stops[0]?.color ?? "#000").color}"
        android:endColor="${svgColor(parsed.stops[parsed.stops.length - 1]?.color ?? "#000").color}"/>
</shape>`;
}

function buildMonochromeXml(config: IconConfig, iconSvg?: string): string {
  return buildAdaptiveForegroundXml(
    { ...config, foregroundColor: config.monochromeColor },
    iconSvg,
  );
}

const README_CONTENT = `Android Icon Studio — Export
============================

Installation:
1. Copy the 'res/' folder to your project's app/src/main/ directory
2. The adaptive icons (API 26+) are in mipmap-anydpi-v26/
3. Legacy PNG icons are in mipmap-{density}/ for older devices
4. Themed icon (Android 13+) is in drawable/ic_launcher_monochrome.xml

Files:
- res/mipmap-*/ic_launcher.png        Legacy launcher icons
- res/mipmap-*/ic_launcher_round.png   Legacy round launcher icons
- res/mipmap-anydpi-v26/              Adaptive icons (API 26+)
- res/drawable/                       Vector drawables
- ic_launcher_playstore_512.png        Play Store listing (512px)
- ic_launcher_playstore_1024.png       Play Store listing (1024px)
- ic_launcher_512.webp                 WebP version
- ic_launcher.svg                      SVG vector version
- ic_launcher.xml                      Android Vector Drawable

Note: For themed icon support (Android 13+), include
drawable/ic_launcher_monochrome.xml and reference it in your
theme or manifest with android:monochrome drawable.
`;

export async function downloadAndroidIcons(
  canvas: HTMLCanvasElement,
  config: IconConfig,
  iconSvg?: string,
) {
  try {
    const zip = new JSZip();

    const densities = androidSizes.map((s) => ({
      folder: s.folder,
      size: s.size,
    }));

    const resFolder = zip.folder("res")!;

    const ssDensity = SUPERSAMPLE_FACTOR_DENSITY;
    const ssPlay = SUPERSAMPLE_FACTOR_PLAY;
    const ssSizeDensity = 512 * ssDensity;
    const ssSizePlay = 512 * ssPlay;
    const superCanvasDensity = createHighQualityCanvas(ssSizeDensity, ssSizeDensity);
    superCanvasDensity.getContext("2d", { willReadFrequently: true })!.drawImage(canvas, 0, 0, ssSizeDensity, ssSizeDensity);
    const superCanvasPlay = createHighQualityCanvas(ssSizePlay, ssSizePlay);
    superCanvasPlay.getContext("2d", { willReadFrequently: true })!.drawImage(canvas, 0, 0, ssSizePlay, ssSizePlay);

    // ic_launcher.png for each density — single-step downscale from 4× source
    const canvasBlobs = await Promise.all(
      densities.map(async ({ folder, size }) => {
        const c = renderCanvasAtSize(superCanvasDensity, size);
        const blob = await canvasToBlob(c);
        return { folder, blob };
      }),
    );
    for (const { folder, blob } of canvasBlobs) {
      resFolder.folder(folder)!.file("ic_launcher.png", blob);
    }

    // ic_launcher_round.png for each density — single-step downscale from 4× source
    const roundBlobs = await Promise.all(
      densities.map(async ({ folder, size }) => {
        const c = renderCanvasAtSize(superCanvasDensity, size);
        const roundCanvas = renderRoundCanvas(c, size);
        const blob = await canvasToBlob(roundCanvas);
        return { folder, blob };
      }),
    );
    for (const { folder, blob } of roundBlobs) {
      resFolder.folder(folder)!.file("ic_launcher_round.png", blob);
    }

    // Play Store PNGs — use 2× supersample (already sufficient for 512/1024)
    const play512 = renderCanvasAtSize(superCanvasPlay, 512);
    const play512Blob = await canvasToBlob(play512);
    zip.file("ic_launcher_playstore_512.png", play512Blob);

    const play1024 = renderCanvasAtSize(superCanvasPlay, 1024);
    const play1024Blob = await canvasToBlob(play1024);
    zip.file("ic_launcher_playstore_1024.png", play1024Blob);

    // WebP — lossy at 0.95 for good balance
    const webpBlob = await canvasToBlob(play512, "image/webp", 0.95);
    zip.file("ic_launcher_512.webp", webpBlob);

    // Adaptive icons (API 26+)
    const adaptiveFolder = resFolder.folder("mipmap-anydpi-v26")!;
    adaptiveFolder.file(
      "ic_launcher.xml",
      `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`,
    );
    adaptiveFolder.file(
      "ic_launcher_round.xml",
      `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`,
    );

    // Drawable vectors
    const drawableFolder = resFolder.folder("drawable")!;
    drawableFolder.file("ic_launcher_background.xml", buildAdaptiveBackgroundXml(config));
    drawableFolder.file("ic_launcher_foreground.xml", buildAdaptiveForegroundXml(config, iconSvg));

    // Monochrome (Android 13+)
    if (config.monochromeEnabled) {
      drawableFolder.file("ic_launcher_monochrome.xml", buildMonochromeXml(config, iconSvg));
    }

    // SVG
    const svgPadding = (config.padding / 100) * 512;
    const svgInnerSize = 512 - svgPadding * 2;
    let foregroundDataUrl: string | undefined;

    if (config.source === "clipart" && iconSvg) {
      try {
        const hiresSize = svgInnerSize * SUPERSAMPLE_FACTOR_PLAY;
        const img = await loadImageFromSvg(iconSvg);
        const fgCanvas = createHighQualityCanvas(hiresSize, hiresSize);
        const fgCtx = fgCanvas.getContext("2d", { willReadFrequently: true })!;
        fgCtx.imageSmoothingEnabled = true;
        fgCtx.imageSmoothingQuality = "high";
        fgCtx.drawImage(img, 0, 0, hiresSize, hiresSize);
        fgCtx.globalCompositeOperation = "source-in";
        fgCtx.fillStyle = config.foregroundColor;
        fgCtx.fillRect(0, 0, hiresSize, hiresSize);
        foregroundDataUrl = fgCanvas.toDataURL("image/png");
      } catch (e) {
        console.error("Failed to render clipart foreground for SVG:", e);
      }
    } else if (config.source === "image" && config.imageDataUrl) {
      try {
        const hiresSize = svgInnerSize * SUPERSAMPLE_FACTOR_PLAY;
        const img = await loadImage(config.imageDataUrl);
        const fgCanvas = createHighQualityCanvas(hiresSize, hiresSize);
        const fgCtx = fgCanvas.getContext("2d", { willReadFrequently: true })!;
        fgCtx.imageSmoothingEnabled = true;
        fgCtx.imageSmoothingQuality = "high";
        fgCtx.drawImage(img, 0, 0, hiresSize, hiresSize);
        foregroundDataUrl = fgCanvas.toDataURL("image/png");
      } catch (e) {
        console.error("Failed to render image foreground for SVG:", e);
      }
    }

    let embeddedFont: string | null = null;
    if (config.source === "text") {
      embeddedFont = await fetchFontAsBase64(
        config.fontFamily,
        config.fontWeight,
      );
    }

    const svg = generateSvg(
      config,
      512,
      foregroundDataUrl,
      iconSvg,
      embeddedFont,
    );
    zip.file("ic_launcher.svg", svg);

    const xml = generateAndroidVectorDrawable(config, 48, iconSvg);
    zip.file("ic_launcher.xml", xml);

    // README
    zip.file("README.txt", README_CONTENT);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "android-icons.zip");
  } catch (err) {
    console.error("Download failed:", err);
  }
}
