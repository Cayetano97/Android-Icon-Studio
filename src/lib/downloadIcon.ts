import { IconConfig } from '@/types/icon';
import * as LucideIcons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function getShapeSvgClip(shape: IconConfig['shape'], size: number): string {
  if (shape === 'circle') {
    const r = size / 2;
    return `<clipPath id="shape"><circle cx="${r}" cy="${r}" r="${r}"/></clipPath>`;
  } else if (shape === 'square') {
    const radius = size * 0.08;
    return `<clipPath id="shape"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath>`;
  } else {
    const radius = size * 0.22;
    return `<clipPath id="shape"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath>`;
  }
}

function getShapeSvgPath(shape: IconConfig['shape'], size: number): string {
  if (shape === 'circle') {
    const r = size / 2;
    return `<circle cx="${r}" cy="${r}" r="${r}"`;
  } else if (shape === 'square') {
    const radius = size * 0.08;
    return `<rect width="${size}" height="${size}" rx="${radius}"`;
  } else {
    const radius = size * 0.22;
    return `<rect width="${size}" height="${size}" rx="${radius}"`;
  }
}

function buildSvgGradientDef(config: IconConfig, size: number): { defs: string; fillRef: string } {
  if (!config.gradient.enabled || config.gradient.stops.length < 2) {
    return { defs: '', fillRef: config.backgroundColor };
  }

  const dirAngles: Record<string, string> = {
    'to bottom':       'x1="50%" y1="0%"  x2="50%" y2="100%"',
    'to top':          'x1="50%" y1="100%" x2="50%" y2="0%"',
    'to right':        'x1="0%"  y1="50%" x2="100%" y2="50%"',
    'to bottom right': 'x1="0%"  y1="0%"  x2="100%" y2="100%"',
    'to bottom left':  'x1="100%" y1="0%" x2="0%"   y2="100%"',
    'to top right':    'x1="0%"  y1="100%" x2="100%" y2="0%"',
  };
  const coords = dirAngles[config.gradient.direction] ?? dirAngles['to bottom right'];
  const stopTags = [...config.gradient.stops]
    .sort((a, b) => a.position - b.position)
    .map(s => `  <stop offset="${s.position}%" stop-color="${s.color}"/>`)
    .join('\n');
  const defs = `<defs>\n<linearGradient id="bgGrad" ${coords}>\n${stopTags}\n</linearGradient>\n</defs>`;
  return { defs, fillRef: 'url(#bgGrad)' };
}

export function generateSvg(config: IconConfig, size: number = 512): string {
  const padding = (config.padding / 100) * size;
  const innerSize = size - padding * 2;
  const clip = getShapeSvgClip(config.shape, size);
  const { defs, fillRef } = buildSvgGradientDef(config, size);

  let foregroundContent = '';

  if (config.source === 'text') {
    foregroundContent = `<text x="${size / 2}" y="${size / 2}" fill="${config.foregroundColor}" font-family="Inter, sans-serif" font-weight="${config.fontWeight}" font-size="${innerSize * 0.55}" text-anchor="middle" dominant-baseline="central">${escapeXml(config.text)}</text>`;
  } else if (config.source === 'clipart') {
    const Icon = (LucideIcons as any)[config.clipartName];
    if (Icon) {
      const markup = renderToStaticMarkup(
        React.createElement(Icon, { size: innerSize, color: config.foregroundColor, strokeWidth: 1.5 })
      );
      foregroundContent = markup.replace('<svg ', `<svg x="${padding}" y="${padding}" `);
    }
  } else if (config.source === 'image' && config.imageDataUrl) {
    foregroundContent = `<image href="${config.imageDataUrl}" x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${defs}
${clip}
<g clip-path="url(#shape)">
  ${getShapeSvgPath(config.shape, size)} fill="${fillRef}"/>
  ${foregroundContent}
</g>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateAndroidVectorDrawable(config: IconConfig, size: number = 24): string {
  const viewportSize = 512;
  const padding = (config.padding / 100) * viewportSize;
  const innerSize = viewportSize - padding * 2;

  let pathData = '';
  
  if (config.source === 'clipart') {
    const Icon = (LucideIcons as any)[config.clipartName];
    if (Icon) {
      const markup = renderToStaticMarkup(
        React.createElement(Icon, { size: innerSize, color: config.foregroundColor, strokeWidth: 1.5 })
      );
      // Extract path d attributes
      const paths = extractPathsFromSvg(markup, padding);
      pathData = paths;
    }
  } else if (config.source === 'text') {
    // Text can't easily be converted to vector paths client-side, provide a basic rect placeholder
    pathData = `    <path
        android:pathData="M${padding},${padding}h${innerSize}v${innerSize}h-${innerSize}z"
        android:fillColor="${config.foregroundColor}"/>
    <!-- Note: Text icons should be replaced with actual vector paths for production -->`;
  }

  // Convert shape to Android path
  let bgPath = '';
  if (config.shape === 'circle') {
    const r = viewportSize / 2;
    bgPath = `M${r},0A${r},${r},0,1,1,${r},${viewportSize}A${r},${r},0,1,1,${r},0Z`;
  } else if (config.shape === 'square') {
    const rad = viewportSize * 0.08;
    bgPath = `M${rad},0L${viewportSize - rad},0Q${viewportSize},0,${viewportSize},${rad}L${viewportSize},${viewportSize - rad}Q${viewportSize},${viewportSize},${viewportSize - rad},${viewportSize}L${rad},${viewportSize}Q0,${viewportSize},0,${viewportSize - rad}L0,${rad}Q0,0,${rad},0Z`;
  } else {
    const rad = viewportSize * 0.22;
    bgPath = `M${rad},0L${viewportSize - rad},0Q${viewportSize},0,${viewportSize},${rad}L${viewportSize},${viewportSize - rad}Q${viewportSize},${viewportSize},${viewportSize - rad},${viewportSize}L${rad},${viewportSize}Q0,${viewportSize},0,${viewportSize - rad}L0,${rad}Q0,0,${rad},0Z`;
  }

  // Android vector drawables don't natively support gradients before API 24.
  // We use the start-stop colours as a comment hint and the first stop (or solid colour) as fill.
  const bgFill = config.gradient.enabled && config.gradient.stops.length >= 2
    ? config.gradient.stops[0].color
    : config.backgroundColor;
  const gradientComment = config.gradient.enabled
    ? `\n    <!-- Gradient: ${config.gradient.stops.map(s => `${s.color} @${s.position}%`).join(' → ')} (direction: ${config.gradient.direction}). For API 24+ use <gradient> tag instead. -->`
    : '';

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
  
  // Extract stroke color from the SVG
  const strokeMatch = svgMarkup.match(/stroke="([^"]+)"/);
  const strokeColor = strokeMatch ? strokeMatch[1] : '#FFFFFF';
  const strokeWidthMatch = svgMarkup.match(/stroke-width="([^"]+)"/);
  const strokeWidth = strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) : 2;

  // Find all path, line, circle, rect, polyline elements
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

  // Handle <line> elements
  const lineRegex = /<line[^>]*x1="([^"]*)"[^>]*y1="([^"]*)"[^>]*x2="([^"]*)"[^>]*y2="([^"]*)"/g;
  while ((match = lineRegex.exec(svgMarkup)) !== null) {
    results.push(`    <path
        android:pathData="M${match[1]},${match[2]}L${match[3]},${match[4]}"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  // Handle <circle> elements  
  const circleRegex = /<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"/g;
  while ((match = circleRegex.exec(svgMarkup)) !== null) {
    const cx = parseFloat(match[1]), cy = parseFloat(match[2]), r = parseFloat(match[3]);
    results.push(`    <path
        android:pathData="M${cx - r},${cy}A${r},${r},0,1,1,${cx + r},${cy}A${r},${r},0,1,1,${cx - r},${cy}Z"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  // Handle <polyline> elements
  const polylineRegex = /<polyline[^>]*points="([^"]*)"/g;
  while ((match = polylineRegex.exec(svgMarkup)) !== null) {
    const points = match[1].trim().split(/\s+/);
    if (points.length >= 2) {
      const pathParts = points.map((p, i) => {
        const [x, y] = p.split(',');
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      });
      results.push(`    <path
        android:pathData="${pathParts.join('')}"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
    }
  }

  // Handle <rect> elements
  const rectRegex = /<rect(?=[^>]*width="([^"]*)")(?=[^>]*height="([^"]*)")(?:[^>]*x="([^"]*)")?(?:[^>]*y="([^"]*)")?[^>]*/g;
  while ((match = rectRegex.exec(svgMarkup)) !== null) {
    const w = match[1], h = match[2], x = match[3] || '0', y = match[4] || '0';
    const rxMatch = svgMarkup.match(/rx="([^"]*)"/);
    const rx = rxMatch ? rxMatch[1] : '0';
    results.push(`    <path
        android:pathData="M${x},${y}h${w}v${h}h-${w}z"
        android:strokeColor="${strokeColor}"
        android:strokeWidth="${strokeWidth}"
        android:fillColor="#00000000"
        android:translateX="${offset}"
        android:translateY="${offset}"/>`);
  }

  return results.join('\n');
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function downloadAndroidIcons(canvas: HTMLCanvasElement, config: IconConfig) {
  const zip = new JSZip();

  const densities = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  // res/ folder with density buckets
  const resFolder = zip.folder('res')!;
  for (const { folder, size } of densities) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const cx = c.getContext('2d')!;
    cx.drawImage(canvas, 0, 0, size, size);
    const blob = await canvasToBlob(c);
    resFolder.folder(folder)!.file('ic_launcher.png', blob);
  }

  // Play Store 512px in root
  const playCanvas = document.createElement('canvas');
  playCanvas.width = 512;
  playCanvas.height = 512;
  playCanvas.getContext('2d')!.drawImage(canvas, 0, 0, 512, 512);
  const playBlob = await canvasToBlob(playCanvas);
  zip.file('ic_launcher_playstore_512.png', playBlob);

  // SVG in root
  const svg = generateSvg(config, 512);
  zip.file('ic_launcher.svg', svg);

  // Android Vector Drawable XML in root
  const xml = generateAndroidVectorDrawable(config, 48);
  zip.file('ic_launcher.xml', xml);

  // Generate and save
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'android-icons.zip');
}
