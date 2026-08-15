import { IconConfig, IconShape } from "@/types/icon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { parseCssGradient } from "@/lib/canvasGradient";
import { cssColorToHex } from "@/lib/color";
import {
  extractPathsFromSvg,
  extractLucideVectorPaths,
  getShapeSvgClip,
  getShapeSvgPath,
} from "@/lib/svgPathUtils";
import { renderIcon, Effect } from "@/lib/iconRenderer";

const SUPERSAMPLE_FACTOR_PLAY = 2;

// Density buckets: multiplier over the base dp size (matches IconKitchen)
const DENSITIES = [
  { folder: "mipmap-mdpi", mult: 1 },
  { folder: "mipmap-hdpi", mult: 1.5 },
  { folder: "mipmap-xhdpi", mult: 2 },
  { folder: "mipmap-xxhdpi", mult: 3 },
  { folder: "mipmap-xxxhdpi", mult: 4 },
] as const;

// Legacy safe zone (content size in dp of 48) per shape — matches IconKitchen
const LEGACY_CONTENT: Record<IconShape, number> = {
  square: 38,
  squircle: 42,
  circle: 44,
  none: 44,
};

// Legacy final effects (gloss + shadows) — mirrors IconKitchen's eyt()
function legacyEffects(mult: number): Effect[] {
  return [
    {
      effect: "inner-shadow",
      color: "rgba(255, 255, 255, 0.2)",
      translateY: 0.25 * mult,
    },
    {
      effect: "inner-shadow",
      color: "rgba(0, 0, 0, 0.2)",
      translateY: -0.25 * mult,
    },
    {
      effect: "outer-shadow",
      color: "rgba(0, 0, 0, 0.3)",
      blur: 0.7 * mult,
      translateY: 0.7 * mult,
    },
    {
      effect: "fill-radialgradient",
      centerX: 0,
      centerY: 0,
      radius: 48 * mult,
      colors: [
        { offset: 0, color: "rgba(255, 255, 255, 0.1)" },
        { offset: 1, color: "rgba(255, 255, 255, 0)" },
      ],
    },
  ];
}

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

function buildAdaptiveIconXml(filename: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/${filename}_background"/>
  <foreground android:drawable="@mipmap/${filename}_foreground"/>
  <monochrome android:drawable="@mipmap/${filename}_monochrome"/>
</adaptive-icon>`;
}

const README_CONTENT = `Android Icon Studio — Export
============================

Installation:
1. Copy the 'res/' folder to your project's app/src/main/ directory
2. Adaptive icons (API 26+) are in mipmap-anydpi-v26/
3. Legacy PNG icons are in mipmap-{density}/ for older devices
4. Themed icons (Android 13+) use the monochrome layer automatically

Files:
- res/mipmap-anydpi-v26/{filename}.xml      Adaptive icon definition
- res/mipmap-*/{filename}.png               Legacy launcher icons (48dp)
- res/mipmap-*/{filename}_background.png    Adaptive background layer (108dp)
- res/mipmap-*/{filename}_foreground.png    Adaptive foreground layer (108dp)
- res/mipmap-*/{filename}_monochrome.png    Monochrome layer (Android 13+)
- play_store_512.png                        Play Store listing (512px)
- {filename}_playstore_1024.png             High-res Play Store extra
- {filename}_512.webp                       WebP version
- {filename}.svg                            Scalable vector version
- {filename}.xml                            Android Vector Drawable

Note: Adaptive layers are 108x108dp with content within the 72x72dp
safe zone, matching the Android Studio icon wizard output.
`;

export async function downloadAndroidIcons(
  config: IconConfig,
  iconSvg?: string,
) {
  try {
    const zip = new JSZip();
    const filename = (config.filename || "ic_launcher")
      .replace(/[^a-z0-9_]/gi, "_");

    const resFolder = zip.folder("res")!;

    // Adaptive icon definition (API 26+)
    const adaptiveFolder = resFolder.folder("mipmap-anydpi-v26")!;
    adaptiveFolder.file(`${filename}.xml`, buildAdaptiveIconXml(filename));

    // Play Store listing (512px, square-sharp like IconKitchen)
    const play = await renderIcon(config, {
      assetSize: { w: 512, h: 512 },
      shape: "square-sharp",
    });
    zip.file("play_store_512.png", await canvasToBlob(play.canvas));

    // Extra high-res Play Store
    const playHi = await renderIcon(config, {
      assetSize: { w: 1024, h: 1024 },
      shape: "square-sharp",
    });
    zip.file(`${filename}_playstore_1024.png`, await canvasToBlob(playHi.canvas));

    // WebP
    zip.file(
      `${filename}_512.webp`,
      await canvasToBlob(play.canvas, "image/webp", 0.95),
    );

    // Per-density assets: adaptive layers at 108dp + legacy at 48dp
    const legacyContent = LEGACY_CONTENT[config.shape] * 1; // dp value
    for (const { folder, mult } of DENSITIES) {
      const adaptiveSize = 108 * mult;
      const contentSize = 72 * mult;
      const layerOptions = {
        assetSize: { w: adaptiveSize, h: adaptiveSize },
        contentSize: { w: contentSize, h: contentSize },
        shape: "square-sharp" as const,
      };

      const [bg, fg, mono] = await Promise.all([
        renderIcon(config, { ...layerOptions, layer: "background" as const }),
        renderIcon(config, { ...layerOptions, layer: "foreground" as const }),
        renderIcon(config, {
          ...layerOptions,
          layer: "foreground" as const,
          monochrome: true,
        }),
      ]);

      const mipmapFolder = resFolder.folder(folder)!;
      mipmapFolder.file(`${filename}_background.png`, await canvasToBlob(bg.canvas));
      mipmapFolder.file(`${filename}_foreground.png`, await canvasToBlob(fg.canvas));
      mipmapFolder.file(`${filename}_monochrome.png`, await canvasToBlob(mono.canvas));

      // Legacy icon: shape + gloss effects (IconKitchen grade)
      const legacySize = 48 * mult;
      const legacy = await renderIcon(config, {
        assetSize: { w: legacySize, h: legacySize },
        contentSize: { w: legacyContent * mult, h: legacyContent * mult },
        shape: config.shape,
        finalEffects: legacyEffects(mult),
      });
      mipmapFolder.file(`${filename}.png`, await canvasToBlob(legacy.canvas));

      // Legacy round icon (extra, keeps classic round bucket)
      if (config.shape !== "circle") {
        const round = await renderIcon(config, {
          assetSize: { w: legacySize, h: legacySize },
          contentSize: { w: 44 * mult, h: 44 * mult },
          shape: "circle",
          finalEffects: legacyEffects(mult),
        });
        mipmapFolder.file(
          `${filename}_round.png`,
          await canvasToBlob(round.canvas),
        );
      }
    }

    // SVG (vector with embedded font for text icons)
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
    zip.file(`${filename}.svg`, svg);

    const xml = generateAndroidVectorDrawable(config, 48, iconSvg);
    zip.file(`${filename}.xml`, xml);

    // README
    zip.file("README.txt", README_CONTENT);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "android-icons.zip");
  } catch (err) {
    console.error("Download failed:", err);
  }
}
