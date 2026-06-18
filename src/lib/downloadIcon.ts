import { IconConfig } from "@/types/icon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { parseCssGradient } from "@/lib/canvasGradient";

const SUPERSAMPLE_FACTOR = 2;

let _svgColorCanvas: HTMLCanvasElement | null = null;
let _svgColorCtx: CanvasRenderingContext2D | null = null;

function parseCssColorToHex(color: string): string {
  if (color.startsWith("#")) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color;
  }
  if (!_svgColorCanvas) {
    _svgColorCanvas = document.createElement("canvas");
    _svgColorCanvas.width = 1;
    _svgColorCanvas.height = 1;
    _svgColorCtx = _svgColorCanvas.getContext("2d");
  }
  if (!_svgColorCtx) return color;
  _svgColorCtx.fillStyle = "#000000";
  _svgColorCtx.fillStyle = color;
  const computed = _svgColorCtx.fillStyle;
  if (computed.startsWith("#")) return computed;
  return color;
}

function svgSafeColor(color: string): string {
  return parseCssColorToHex(color);
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
  const hex = parseCssColorToHex(color);
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
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return c;
}

function getShapeSvgClip(shape: IconConfig["shape"], size: number): string {
  if (shape === "circle") {
    const r = size / 2;
    return `<clipPath id="shape"><circle cx="${r}" cy="${r}" r="${r}"/></clipPath>`;
  } else if (shape === "square") {
    const radius = size * 0.08;
    return `<clipPath id="shape"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath>`;
  } else if (shape === "squircle") {
    const radius = size * 0.22;
    return `<clipPath id="shape"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath>`;
  } else {
    return `<clipPath id="shape"><rect width="${size}" height="${size}"/></clipPath>`;
  }
}

function getShapeSvgPath(shape: IconConfig["shape"], size: number): string {
  if (shape === "circle") {
    const r = size / 2;
    return `<circle cx="${r}" cy="${r}" r="${r}"`;
  } else if (shape === "square") {
    const radius = size * 0.08;
    return `<rect width="${size}" height="${size}" rx="${radius}"`;
  } else if (shape === "squircle") {
    const radius = size * 0.22;
    return `<rect width="${size}" height="${size}" rx="${radius}"`;
  } else {
    return `<rect width="${size}" height="${size}"`;
  }
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
  const formatStop = (stop: { color: string; position: number }, index: number) => {
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

function extractLucideVectorPaths(
  svgMarkup: string,
  offsetX: number,
  offsetY: number,
  scale: number,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return "";

  const viewBox = svgEl.getAttribute("viewBox");
  let vbW = 24;
  let vbH = 24;
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      vbW = parts[2];
      vbH = parts[3];
    }
  }

  const groupAttrs = `transform="translate(${offsetX}, ${offsetY}) scale(${scale / vbW})"`;
  const parts: string[] = [];

  const rootInherited: Record<string, string> = {};
  const inheritableAttrs = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "fill-rule",
  ];
  for (const attr of inheritableAttrs) {
    const val = svgEl.getAttribute(attr);
    if (val !== null) rootInherited[attr] = val;
  }

  const walk = (el: Element, inherited: Record<string, string>) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "svg" || tag === "defs" || tag === "title" || tag === "desc") {
      for (const child of Array.from(el.children))
        walk(child, inherited);
      return;
    }

    const merged: Record<string, string> = { ...inherited };
    for (const attr of inheritableAttrs) {
      const val = el.getAttribute(attr);
      if (val !== null) merged[attr] = val;
    }

    const attrs = Object.entries(merged)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");

    if (tag === "g") {
      parts.push(`<g ${attrs}>`);
      for (const child of Array.from(el.children)) walk(child, merged);
      parts.push(`</g>`);
      return;
    }

    if (tag === "path") {
      const d = el.getAttribute("d");
      if (d) parts.push(`<path d="${d}" ${attrs}/>`);
    } else if (tag === "line") {
      const x1 = el.getAttribute("x1") ?? "0";
      const y1 = el.getAttribute("y1") ?? "0";
      const x2 = el.getAttribute("x2") ?? "0";
      const y2 = el.getAttribute("y2") ?? "0";
      parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`);
    } else if (tag === "circle") {
      const cx = el.getAttribute("cx") ?? "0";
      const cy = el.getAttribute("cy") ?? "0";
      const r = el.getAttribute("r") ?? "0";
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`);
    } else if (tag === "ellipse") {
      const cx = el.getAttribute("cx") ?? "0";
      const cy = el.getAttribute("cy") ?? "0";
      const rx = el.getAttribute("rx") ?? "0";
      const ry = el.getAttribute("ry") ?? "0";
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`);
    } else if (tag === "polyline") {
      const points = el.getAttribute("points");
      if (points) parts.push(`<polyline points="${points}" ${attrs}/>`);
    } else if (tag === "polygon") {
      const points = el.getAttribute("points");
      if (points) parts.push(`<polygon points="${points}" ${attrs}/>`);
    } else if (tag === "rect") {
      const x = el.getAttribute("x") ?? "0";
      const y = el.getAttribute("y") ?? "0";
      const w = el.getAttribute("width") ?? "0";
      const h = el.getAttribute("height") ?? "0";
      const rx = el.getAttribute("rx");
      const rxAttr = rx ? ` rx="${rx}"` : "";
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxAttr} ${attrs}/>`);
    }
  };

  for (const child of Array.from(svgEl.children)) {
    walk(child, rootInherited);
  }

  if (parts.length === 0) return "";

  return `<g ${groupAttrs} shape-rendering="geometricPrecision">\n    ${parts.join("\n    ")}\n  </g>`;
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
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(fontBuffer)),
    );

    return `@font-face {\n      font-family: '${fontFamily}';\n      font-weight: ${fontWeight};\n      src: url(data:font/woff2;base64,${base64}) format('woff2');\n    }`;
  } catch {
    return null;
  }
}

function generateIcoBlob(canvases: HTMLCanvasElement[]): Promise<Blob> {
  const numImages = canvases.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const directorySize = dirEntrySize * numImages;

  const bmpDatas: Uint8Array[] = [];
  let totalSize = headerSize + directorySize;

  for (const canvas of canvases) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    const bmpHeaderSize = 40;
    const pixelDataSize = w * h * 4;
    const maskRowSize = Math.ceil(w / 32) * 4;
    const maskDataSize = maskRowSize * h;
    const bmpSize = bmpHeaderSize + pixelDataSize + maskDataSize;

    const bmp = new Uint8Array(bmpSize);
    const view = new DataView(bmp.buffer);

    view.setUint32(0, bmpHeaderSize, true);
    view.setInt32(4, w, true);
    view.setInt32(8, h * 2, true);
    view.setUint16(12, 1, true);
    view.setUint16(14, 32, true);
    view.setUint32(16, 0, true);
    view.setUint32(20, pixelDataSize + maskDataSize, true);

    let offset = bmpHeaderSize;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        bmp[offset] = pixels[srcIdx + 2];
        bmp[offset + 1] = pixels[srcIdx + 1];
        bmp[offset + 2] = pixels[srcIdx];
        bmp[offset + 3] = pixels[srcIdx + 3];
        offset += 4;
      }
    }

    for (let y = h - 1; y >= 0; y--) {
      let maskByte = 0;
      for (let x = 0; x < w; x++) {
        const alpha = pixels[(y * w + x) * 4 + 3];
        if (alpha < 128) maskByte |= 1 << (7 - (x % 8));
        if ((x + 1) % 8 === 0 || x === w - 1) {
          bmp[offset++] = maskByte;
          maskByte = 0;
        }
      }
      while (offset % 4 !== 0) offset++;
    }

    bmpDatas.push(bmp);
    totalSize += bmpSize;
  }

  const ico = new Uint8Array(totalSize);
  const view = new DataView(ico.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, numImages, true);

  let dataOffset = headerSize + directorySize;
  for (let i = 0; i < numImages; i++) {
    const canvas = canvases[i];
    const entryOffset = headerSize + i * dirEntrySize;
    const w = canvas.width > 255 ? 0 : canvas.width;
    const h = canvas.height > 255 ? 0 : canvas.height;

    ico[entryOffset] = w;
    ico[entryOffset + 1] = h;
    ico[entryOffset + 2] = 0;
    ico[entryOffset + 3] = 0;
    view.setUint16(entryOffset + 4, 1, true);
    view.setUint16(entryOffset + 6, 32, true);
    view.setUint32(entryOffset + 8, bmpDatas[i].length, true);
    view.setUint32(entryOffset + 12, dataOffset, true);
    dataOffset += bmpDatas[i].length;
  }

  dataOffset = headerSize + directorySize;
  for (const bmp of bmpDatas) {
    ico.set(bmp, dataOffset);
    dataOffset += bmp.length;
  }

  return Promise.resolve(
    new Blob([ico], { type: "image/vnd.microsoft.icon" }),
  );
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
    const paths = extractPathsFromSvg(iconSvg, padding, innerSize);
    pathData = paths;
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
    const innerMatch = bg.match(/-gradient\(((?:[^()]+|\([^()]*\))*)\)$/);
    if (innerMatch) {
      const parts = innerMatch[1]
        .split(/,(?![^\(]*\))/)
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

function extractPathsFromSvg(
  svgMarkup: string,
  offset: number,
  innerSize: number,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return "";

  const viewBox = svgEl.getAttribute("viewBox");
  let srcW = 24;
  let srcH = 24;
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      srcW = parts[2];
      srcH = parts[3];
    }
  }

  const scale = innerSize / Math.max(srcW, srcH);
  const results: string[] = [];

  const rootStroke = svgEl.getAttribute("stroke") ?? "#FFFFFF";
  const rootStrokeW = parseFloat(
    svgEl.getAttribute("stroke-width") ?? "2",
  );
  const rootFill = svgEl.getAttribute("fill") ?? "none";

  const processElement = (el: Element, inherited: { stroke: string; strokeWidth: number; fill: string }) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "defs" || tag === "title" || tag === "desc") return;

    const elStroke = el.getAttribute("stroke") ?? inherited.stroke;
    const elStrokeW = el.getAttribute("stroke-width")
      ? parseFloat(el.getAttribute("stroke-width")!)
      : inherited.strokeWidth;
    const elFill = el.getAttribute("fill") ?? inherited.fill;

    const childInherited = {
      stroke: elStroke,
      strokeWidth: elStrokeW,
      fill: elFill,
    };

    const strokeAttr =
      elStroke !== "none" && elStroke !== "transparent"
        ? `\n        android:strokeColor="${elStroke}"`
        : "";
    const strokeWAttr =
      elStroke !== "none" && elStroke !== "transparent"
        ? `\n        android:strokeWidth="${(elStrokeW * scale).toFixed(2)}"`
        : "";
    const fillAttr =
      elFill !== "none" && elFill !== "transparent"
        ? `\n        android:fillColor="${elFill}"`
        : `\n        android:fillColor="#00000000"`;

    if (tag === "path") {
      const d = el.getAttribute("d");
      if (d) {
        results.push(
          `    <path\n        android:pathData="${d}"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
        );
      }
    } else if (tag === "line") {
      const x1 = el.getAttribute("x1") ?? "0";
      const y1 = el.getAttribute("y1") ?? "0";
      const x2 = el.getAttribute("x2") ?? "0";
      const y2 = el.getAttribute("y2") ?? "0";
      results.push(
        `    <path\n        android:pathData="M${x1},${y1}L${x2},${y2}"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
      );
    } else if (tag === "circle") {
      const cx = parseFloat(el.getAttribute("cx") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? "0");
      const r = parseFloat(el.getAttribute("r") ?? "0");
      results.push(
        `    <path\n        android:pathData="M${cx - r},${cy}A${r},${r},0,1,1,${cx + r},${cy}A${r},${r},0,1,1,${cx - r},${cy}Z"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
      );
    } else if (tag === "polyline") {
      const points = el.getAttribute("points")?.trim().split(/\s+/);
      if (points && points.length >= 2) {
        const pathParts = points.map((p, i) => {
          const [x, y] = p.split(",");
          return i === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
        results.push(
          `    <path\n        android:pathData="${pathParts.join("")}"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
        );
      }
    } else if (tag === "rect") {
      const x = el.getAttribute("x") ?? "0";
      const y = el.getAttribute("y") ?? "0";
      const w = el.getAttribute("width") ?? "0";
      const h = el.getAttribute("height") ?? "0";
      const rx = el.getAttribute("rx");
      if (rx && parseFloat(rx) > 0) {
        const r = parseFloat(rx);
        const wf = parseFloat(w);
        const hf = parseFloat(h);
        results.push(
          `    <path\n        android:pathData="M${parseFloat(x) + r},${y}L${parseFloat(x) + wf - r},${y}Q${parseFloat(x) + wf},${y},${parseFloat(x) + wf},${parseFloat(y) + r}L${parseFloat(x) + wf},${parseFloat(y) + hf - r}Q${parseFloat(x) + wf},${parseFloat(y) + hf},${parseFloat(x) + wf - r},${parseFloat(y) + hf}L${parseFloat(x) + r},${parseFloat(y) + hf}Q${x},${parseFloat(y) + hf},${x},${parseFloat(y) + hf - r}L${x},${parseFloat(y) + r}Q${x},${y},${parseFloat(x) + r},${y}Z"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
        );
      } else {
        results.push(
          `    <path\n        android:pathData="M${x},${y}h${w}v${h}h-${w}z"${strokeAttr}${strokeWAttr}${fillAttr}\n        android:translateX="${offset}"\n        android:translateY="${offset}"\n        android:scaleX="${(scale / srcW).toFixed(6)}"\n        android:scaleY="${(scale / srcH).toFixed(6)}"/>`,
        );
      }
    } else if (tag === "g") {
      for (const child of Array.from(el.children)) {
        processElement(child, childInherited);
      }
    }
  };

  const rootInherited = {
    stroke: rootStroke,
    strokeWidth: rootStrokeW,
    fill: rootFill,
  };

  for (const child of Array.from(svgEl.children)) {
    processElement(child, rootInherited);
  }

  return results.join("\n");
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
  c.getContext("2d")!.drawImage(source, 0, 0, targetSize, targetSize);
  return c;
}

export async function downloadAndroidIcons(
  canvas: HTMLCanvasElement,
  config: IconConfig,
  iconSvg?: string,
) {
  try {
    const zip = new JSZip();

    const densities = [
      { folder: "mipmap-mdpi", size: 48 },
      { folder: "mipmap-hdpi", size: 72 },
      { folder: "mipmap-xhdpi", size: 96 },
      { folder: "mipmap-xxhdpi", size: 144 },
      { folder: "mipmap-xxxhdpi", size: 192 },
    ];

    const resFolder = zip.folder("res")!;

    const ssFactor = SUPERSAMPLE_FACTOR;
    const ssSize = 512 * ssFactor;
    const superCanvas = createHighQualityCanvas(ssSize, ssSize);
    superCanvas.getContext("2d")!.drawImage(canvas, 0, 0, ssSize, ssSize);

    const canvasBlobs = await Promise.all(
      densities.map(async ({ folder, size }) => {
        const targetSize = size * ssFactor;
        const c = renderCanvasAtSize(superCanvas, targetSize);
        const finalCanvas = renderCanvasAtSize(c, size);
        const blob = await canvasToBlob(finalCanvas);
        return { folder, blob };
      }),
    );
    for (const { folder, blob } of canvasBlobs) {
      resFolder.folder(folder)!.file("ic_launcher.png", blob);
    }

    const play512 = renderCanvasAtSize(superCanvas, 512);
    const play512Blob = await canvasToBlob(play512);
    zip.file("ic_launcher_playstore_512.png", play512Blob);

    const play1024 = renderCanvasAtSize(superCanvas, 1024);
    const play1024Blob = await canvasToBlob(play1024);
    zip.file("ic_launcher_playstore_1024.png", play1024Blob);

    const webpBlob = await canvasToBlob(play512, "image/webp", 1.0);
    zip.file("ic_launcher_512.webp", webpBlob);

    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoCanvases = icoSizes.map((s) => renderCanvasAtSize(superCanvas, s));
    const icoBlob = await generateIcoBlob(icoCanvases);
    zip.file("favicon.ico", icoBlob);

    const svgPadding = (config.padding / 100) * 512;
    const svgInnerSize = 512 - svgPadding * 2;
    let foregroundDataUrl: string | undefined;

    if (config.source === "clipart" && iconSvg) {
      try {
        const hiresSize = svgInnerSize * ssFactor;
        const img = await loadImageFromSvg(iconSvg);
        const fgCanvas = createHighQualityCanvas(hiresSize, hiresSize);
        const fgCtx = fgCanvas.getContext("2d")!;
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
        const hiresSize = svgInnerSize * ssFactor;
        const img = await loadImage(config.imageDataUrl);
        const fgCanvas = createHighQualityCanvas(hiresSize, hiresSize);
        const fgCtx = fgCanvas.getContext("2d")!;
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

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "android-icons.zip");
  } catch (err) {
    console.error("Download failed:", err);
  }
}
