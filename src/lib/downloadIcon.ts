import { IconConfig } from "@/types/icon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { parseCssGradient } from "@/lib/canvasGradient";

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
  return { color, opacity: 1 };
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
    return { defs: "", fillRef: bg };
  }

  const parsed = parseCssGradient(bg);
  if (!parsed) {
    return { defs: "", fillRef: bg };
  }

  const hw = size / 2;
  const hh = size / 2;

  const formatStop = (stop: { color: string; position: number }) => {
    const posStr = Number.isFinite(stop.position) ? ` offset="${stop.position}%"` : "";
    const { color, opacity } = svgColor(stop.color);
    const opacityAttr = opacity < 1 ? ` stop-opacity="${opacity}"` : "";
    return `    <stop${posStr} stop-color="${color}"${opacityAttr}/>`;
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

export async function generateSvg(
  config: IconConfig,
  size: number = 512,
  foregroundDataUrl?: string,
): Promise<string> {
  const padding = (config.padding / 100) * size;
  const innerSize = size - padding * 2;
  const { defs: gradientDef, fillRef } = buildSvgGradientDef(config, size);
  const clipDef = getShapeSvgClip(config.shape, size);

  const defsParts: string[] = [];
  if (gradientDef) defsParts.push(gradientDef);
  if (clipDef) defsParts.push(clipDef);
  const defsBlock =
    defsParts.length > 0 ? `<defs>\n${defsParts.join("\n")}\n</defs>` : "";

  let foregroundContent = "";

  if (config.source === "text") {
    const yOffset = config.fontFamily === "Bebas Neue" ? 4 : 0;
    foregroundContent = `<text x="${size / 2}" y="${size / 2 + yOffset}" fill="${config.foregroundColor}" font-family="${config.fontFamily}, sans-serif" font-weight="${config.fontWeight}" font-size="${innerSize * 0.5}" text-anchor="middle" dominant-baseline="central">${escapeXml(config.text)}</text>`;
  } else if (
    (config.source === "clipart" || config.source === "image") &&
    foregroundDataUrl
  ) {
    foregroundContent = `<image href="${foregroundDataUrl}" x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
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
    const paths = extractPathsFromSvg(iconSvg, padding);
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
      const parts = innerMatch[1].split(/,(?![^\(]*\))/).map((x) => x.trim());
      const firstStop = parts.find(
        (p) => p.startsWith("rgb") || p.startsWith("#"),
      );
      if (firstStop) {
        bgFill = firstStop.split(" ").slice(0, -1).join(" ");
        if (!bgFill) bgFill = firstStop;
      }
      gradientComment = `\n    <!-- Gradient used defined by background css: ${bg}. For API 24+ use <gradient> tag instead. -->`;
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

function extractPathsFromSvg(svgMarkup: string, offset: number): string {
  const results: string[] = [];

  const strokeMatch = svgMarkup.match(/stroke="([^"]+)"/);
  const strokeColor = strokeMatch ? strokeMatch[1] : "#FFFFFF";
  const strokeWidthMatch = svgMarkup.match(/stroke-width="([^"]+)"/);
  const strokeWidth = strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) : 2;

  const pathRegex = /d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(svgMarkup)) !== null) {
    results.push(`    <path
        android:pathData="${match[1]}"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  const lineRegex =
    /<line[^>]*x1="([^"]*)"[^>]*y1="([^"]*)"[^>]*x2="([^"]*)"[^>]*y2="([^"]*)"/g;
  while ((match = lineRegex.exec(svgMarkup)) !== null) {
    results.push(`    <path
        android:pathData="M${match[1]},${match[2]}L${match[3]},${match[4]}"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  const circleRegex =
    /<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"/g;
  while ((match = circleRegex.exec(svgMarkup)) !== null) {
    const cx = parseFloat(match[1]),
      cy = parseFloat(match[2]),
      r = parseFloat(match[3]);
    results.push(`    <path
        android:pathData="M${cx - r},${cy}A${r},${r},0,1,1,${cx + r},${cy}A${r},${r},0,1,1,${cx - r},${cy}Z"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  const polylineRegex = /<polyline[^>]*points="([^"]*)"/g;
  while ((match = polylineRegex.exec(svgMarkup)) !== null) {
    const points = match[1].trim().split(/\s+/);
    if (points.length >= 2) {
      const pathParts = points.map((p, i) => {
        const [x, y] = p.split(",");
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      });
      results.push(`    <path
        android:pathData="${pathParts.join("")}"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
    }
  }

  const rectRegex =
    /<rect(?=[^>]*width="([^"]*)")(?=[^>]*height="([^"]*)")(?:[^>]*x="([^"]*)")?(?:[^>]*y="([^"]*)")?[^>]*/g;
  while ((match = rectRegex.exec(svgMarkup)) !== null) {
    const w = match[1],
      h = match[2],
      x = match[3] || "0",
      y = match[4] || "0";
    results.push(`    <path
        android:pathData="M${x},${y}h${w}v${h}h-${w}z"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  return results.join("\n");
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
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
    const canvasBlobs = await Promise.all(
      densities.map(async ({ folder, size }) => {
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const cx = c.getContext("2d")!;
        cx.drawImage(canvas, 0, 0, size, size);
        const blob = await canvasToBlob(c);
        return { folder, blob };
      }),
    );
    for (const { folder, blob } of canvasBlobs) {
      resFolder.folder(folder)!.file("ic_launcher.png", blob);
    }

    const playCanvas = document.createElement("canvas");
    playCanvas.width = 512;
    playCanvas.height = 512;
    playCanvas.getContext("2d")!.drawImage(canvas, 0, 0, 512, 512);
    const playBlob = await canvasToBlob(playCanvas);
    zip.file("ic_launcher_playstore_512.png", playBlob);

    const svgPadding = (config.padding / 100) * 512;
    const svgInnerSize = 512 - svgPadding * 2;
    let foregroundDataUrl: string | undefined;

    if (config.source === "clipart" && iconSvg) {
      try {
        const img = await loadImageFromSvg(iconSvg);
        const fgCanvas = document.createElement("canvas");
        fgCanvas.width = svgInnerSize;
        fgCanvas.height = svgInnerSize;
        const fgCtx = fgCanvas.getContext("2d")!;
        fgCtx.drawImage(img, 0, 0, svgInnerSize, svgInnerSize);
        fgCtx.globalCompositeOperation = "source-in";
        fgCtx.fillStyle = config.foregroundColor;
        fgCtx.fillRect(0, 0, svgInnerSize, svgInnerSize);
        foregroundDataUrl = fgCanvas.toDataURL("image/png");
      } catch (e) {
        console.error("Failed to render clipart foreground for SVG:", e);
      }
    } else if (config.source === "image" && config.imageDataUrl) {
      try {
        const img = await loadImage(config.imageDataUrl);
        const fgCanvas = document.createElement("canvas");
        fgCanvas.width = svgInnerSize;
        fgCanvas.height = svgInnerSize;
        const fgCtx = fgCanvas.getContext("2d")!;
        fgCtx.drawImage(img, 0, 0, svgInnerSize, svgInnerSize);
        foregroundDataUrl = fgCanvas.toDataURL("image/png");
      } catch (e) {
        console.error("Failed to render image foreground for SVG:", e);
      }
    }

    const svg = await generateSvg(config, 512, foregroundDataUrl);
    zip.file("ic_launcher.svg", svg);

    const xml = generateAndroidVectorDrawable(config, 48, iconSvg);
    zip.file("ic_launcher.xml", xml);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "android-icons.zip");
  } catch (err) {
    console.error("Download failed:", err);
  }
}
