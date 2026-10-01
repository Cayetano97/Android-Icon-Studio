import type { IconConfig } from "@/types/icon";

/**
 * Extract path data from an SVG markup string for Android Vector Drawable export.
 */
export function extractPathsFromSvg(
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

  // Uniform scale; the group transform handles translate + scale so stroke
  // widths can stay at their source values.
  const scale = innerSize / Math.max(srcW, srcH);
  const results: string[] = [];

  const rootStroke = svgEl.getAttribute("stroke") ?? "#FFFFFF";
  const rootStrokeW = parseFloat(
    svgEl.getAttribute("stroke-width") ?? "2",
  );
  const rootFill = svgEl.getAttribute("fill") ?? "none";
  const rootLineCap = svgEl.getAttribute("stroke-linecap") ?? "";
  const rootLineJoin = svgEl.getAttribute("stroke-linejoin") ?? "";
  const rootFillRule = svgEl.getAttribute("fill-rule") ?? "";

  const processElement = (
    el: Element,
    inherited: {
      stroke: string;
      strokeWidth: number;
      fill: string;
      lineCap: string;
      lineJoin: string;
      fillRule: string;
    },
  ) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "defs" || tag === "title" || tag === "desc") return;

    const elStroke = el.getAttribute("stroke") ?? inherited.stroke;
    const elStrokeW = el.getAttribute("stroke-width")
      ? parseFloat(el.getAttribute("stroke-width")!)
      : inherited.strokeWidth;
    const elFill = el.getAttribute("fill") ?? inherited.fill;
    const elLineCap = el.getAttribute("stroke-linecap") ?? inherited.lineCap;
    const elLineJoin = el.getAttribute("stroke-linejoin") ?? inherited.lineJoin;
    const elFillRule = el.getAttribute("fill-rule") ?? inherited.fillRule;

    const childInherited = {
      stroke: elStroke,
      strokeWidth: elStrokeW,
      fill: elFill,
      lineCap: elLineCap,
      lineJoin: elLineJoin,
      fillRule: elFillRule,
    };

    const hasStroke = elStroke !== "none" && elStroke !== "transparent";
    const strokeAttr = hasStroke
      ? `\n        android:strokeColor="${elStroke}"`
      : "";
    const strokeWAttr = hasStroke
      ? `\n        android:strokeWidth="${elStrokeW}"`
      : "";
    const lineCapAttr =
      hasStroke &&
      (elLineCap === "round" || elLineCap === "butt" || elLineCap === "square")
        ? `\n        android:strokeLineCap="${elLineCap}"`
        : "";
    const lineJoinAttr =
      hasStroke &&
      (elLineJoin === "round" ||
        elLineJoin === "bevel" ||
        elLineJoin === "miter")
        ? `\n        android:strokeLineJoin="${elLineJoin}"`
        : "";
    const fillTypeAttr =
      elFillRule === "evenodd" ? `\n        android:fillType="evenOdd"` : "";
    const fillAttr =
      elFill !== "none" && elFill !== "transparent"
        ? `\n        android:fillColor="${elFill}"`
        : `\n        android:fillColor="#00000000"`;

    const pathAttrs = `${strokeAttr}${strokeWAttr}${lineCapAttr}${lineJoinAttr}${fillTypeAttr}${fillAttr}`;
    const pushPath = (pathData: string) => {
      results.push(
        `    <path\n        android:pathData="${pathData}"${pathAttrs}/>`,
      );
    };

    if (tag === "path") {
      const d = el.getAttribute("d");
      if (d) pushPath(d);
    } else if (tag === "line") {
      const x1 = el.getAttribute("x1") ?? "0";
      const y1 = el.getAttribute("y1") ?? "0";
      const x2 = el.getAttribute("x2") ?? "0";
      const y2 = el.getAttribute("y2") ?? "0";
      pushPath(`M${x1},${y1}L${x2},${y2}`);
    } else if (tag === "circle") {
      const cx = parseFloat(el.getAttribute("cx") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? "0");
      const r = parseFloat(el.getAttribute("r") ?? "0");
      pushPath(
        `M${cx - r},${cy}A${r},${r},0,1,1,${cx + r},${cy}A${r},${r},0,1,1,${cx - r},${cy}Z`,
      );
    } else if (tag === "ellipse") {
      const cx = parseFloat(el.getAttribute("cx") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? "0");
      const rx = parseFloat(el.getAttribute("rx") ?? "0");
      const ry = parseFloat(el.getAttribute("ry") ?? "0");
      pushPath(
        `M${cx - rx},${cy}A${rx},${ry},0,1,1,${cx + rx},${cy}A${rx},${ry},0,1,1,${cx - rx},${cy}Z`,
      );
    } else if (tag === "polyline") {
      const points = el.getAttribute("points")?.trim().split(/\s+/);
      if (points && points.length >= 2) {
        const pathParts = points.map((p, i) => {
          const [x, y] = p.split(",");
          return i === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
        pushPath(pathParts.join(""));
      }
    } else if (tag === "polygon") {
      const points = el.getAttribute("points")?.trim().split(/\s+/);
      if (points && points.length >= 2) {
        const pathParts = points.map((p, i) => {
          const [x, y] = p.split(",");
          return i === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
        pushPath(`${pathParts.join("")}Z`);
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
        pushPath(
          `M${parseFloat(x) + r},${y}L${parseFloat(x) + wf - r},${y}Q${parseFloat(x) + wf},${y},${parseFloat(x) + wf},${parseFloat(y) + r}L${parseFloat(x) + wf},${parseFloat(y) + hf - r}Q${parseFloat(x) + wf},${parseFloat(y) + hf},${parseFloat(x) + wf - r},${parseFloat(y) + hf}L${parseFloat(x) + r},${parseFloat(y) + hf}Q${x},${parseFloat(y) + hf},${x},${parseFloat(y) + hf - r}L${x},${parseFloat(y) + r}Q${x},${y},${parseFloat(x) + r},${y}Z`,
        );
      } else {
        pushPath(`M${x},${y}h${w}v${h}h-${w}z`);
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
    lineCap: rootLineCap,
    lineJoin: rootLineJoin,
    fillRule: rootFillRule,
  };

  for (const child of Array.from(svgEl.children)) {
    processElement(child, rootInherited);
  }

  if (results.length === 0) return "";

  return `    <group
        android:translateX="${offset}"
        android:translateY="${offset}"
        android:scaleX="${scale.toFixed(6)}"
        android:scaleY="${scale.toFixed(6)}">
${results.join("\n")}
    </group>`;
}

/**
 * Extract SVG paths with transform for SVG export (preserving vector quality).
 */
export function extractLucideVectorPaths(
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
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      vbW = parts[2];
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
    if (
      tag === "svg" ||
      tag === "defs" ||
      tag === "title" ||
      tag === "desc"
    ) {
      for (const child of Array.from(el.children)) walk(child, inherited);
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
      parts.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`,
      );
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
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`,
      );
    } else if (tag === "polyline") {
      const points = el.getAttribute("points");
      if (points)
        parts.push(`<polyline points="${points}" ${attrs}/>`);
    } else if (tag === "polygon") {
      const points = el.getAttribute("points");
      if (points)
        parts.push(`<polygon points="${points}" ${attrs}/>`);
    } else if (tag === "rect") {
      const x = el.getAttribute("x") ?? "0";
      const y = el.getAttribute("y") ?? "0";
      const w = el.getAttribute("width") ?? "0";
      const h = el.getAttribute("height") ?? "0";
      const rx = el.getAttribute("rx");
      const rxAttr = rx ? ` rx="${rx}"` : "";
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxAttr} ${attrs}/>`,
      );
    }
  };

  for (const child of Array.from(svgEl.children)) {
    walk(child, rootInherited);
  }

  if (parts.length === 0) return "";

  return `<g ${groupAttrs} shape-rendering="geometricPrecision">\n    ${parts.join("\n    ")}\n  </g>`;
}

/**
 * Generate SVG shape element for a given icon shape.
 */
export function getShapeSvgPath(
  shape: IconConfig["shape"],
  size: number,
): string {
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

/**
 * Generate SVG clipPath element for a given icon shape.
 */
export function getShapeSvgClip(
  shape: IconConfig["shape"],
  size: number,
): string {
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
