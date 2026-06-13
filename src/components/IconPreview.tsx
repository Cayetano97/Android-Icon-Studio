import { useRef, useEffect, useCallback, memo } from "react";
import { IconConfig } from "@/types/icon";
import * as LucideIcons from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

interface Props {
  config: IconConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onIconSvg?: (svg: string) => void;
}

function getClipPath(shape: IconConfig["shape"], size: number): Path2D {
  const path = new Path2D();
  const r = size / 2;
  if (shape === "circle") {
    path.arc(r, r, r, 0, Math.PI * 2);
  } else if (shape === "square") {
    const radius = size * 0.08;
    path.roundRect(0, 0, size, size, radius);
  } else if (shape === "squircle") {
    const radius = size * 0.22;
    path.roundRect(0, 0, size, size, radius);
  }
  return path;
}

import { applyCanvasBackground } from "@/lib/canvasGradient";

function IconPreview({ config, canvasRef, onIconSvg }: Props) {
  const previewSize = 512;
  const padding = (config.padding / 100) * previewSize;
  const innerSize = previewSize - padding * 2;
  const iconImgRef = useRef<HTMLImageElement | null>(null);
  const iconLoadedRef = useRef(false);
  const lastClipartRef = useRef<string | null>(null);
  const lastColorRef = useRef<string>("");
  const lastIconSvgRef = useRef<string>("");
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smallCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const scheduleDrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (config.source === "clipart") {
      if (lastClipartRef.current === config.clipartName && iconImgRef.current)
        return;

      const Icon = (LucideIcons as any)[config.clipartName];
      if (Icon) {
        iconLoadedRef.current = false;
        try {
          const svgMarkup = renderToStaticMarkup(
            <Icon size={previewSize} color="#000000" strokeWidth={1.5} />,
          );
          lastIconSvgRef.current = svgMarkup;

          const exportSvg = renderToStaticMarkup(
            <Icon size={innerSize} color={config.foregroundColor} strokeWidth={1.5} />,
          );
          onIconSvg?.(exportSvg);
          lastColorRef.current = config.foregroundColor;

          const img = new Image();
          const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          img.onload = () => {
            iconImgRef.current = img;
            lastClipartRef.current = config.clipartName;
            iconLoadedRef.current = true;
            URL.revokeObjectURL(url);
            scheduleDrawRef.current?.();
          };
          img.src = url;
        } catch (e) {
          console.error(`Error loading clipart mask:`, e);
        }
      }
    } else if (config.source === "image" && config.imageDataUrl) {
      if (lastClipartRef.current === config.imageDataUrl && iconImgRef.current)
        return;

      iconLoadedRef.current = false;
      const img = new Image();
      img.onload = () => {
        iconImgRef.current = img;
        lastClipartRef.current = config.imageDataUrl;
        iconLoadedRef.current = true;
        scheduleDrawRef.current?.();
      };
      img.src = config.imageDataUrl;
    } else if (config.source === "text") {
      const fontUrl = `https://fonts.googleapis.com/css2?family=${config.fontFamily.replace(/ /g, "+")}:wght@${config.fontWeight}&display=swap`;

      let link = document.getElementById("google-font-link") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.id = "google-font-link";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      if (link.href !== fontUrl) {
        iconLoadedRef.current = false;
        link.href = fontUrl;

        document.fonts
          .load(`${config.fontWeight} 16px "${config.fontFamily}"`)
          .then(() => {
            iconLoadedRef.current = true;
            scheduleDrawRef.current?.();
          })
          .catch((err) => {
            console.error("Font loading failed:", err);
            iconLoadedRef.current = true;
            scheduleDrawRef.current?.();
          });
      } else {
        iconLoadedRef.current = true;
      }
    } else {
      iconImgRef.current = null;
      lastClipartRef.current = null;
      iconLoadedRef.current = false;
    }
  }, [
    config.clipartName,
    config.source,
    config.imageDataUrl,
    config.fontFamily,
    config.fontWeight,
    onIconSvg,
  ]);

  useEffect(() => {
    if (config.source !== "clipart") return;
    const Icon = (LucideIcons as any)[config.clipartName];
    if (!Icon) return;
    const exportSvg = renderToStaticMarkup(
      <Icon size={innerSize} color={config.foregroundColor} strokeWidth={1.5} />,
    );
    onIconSvg?.(exportSvg);
  }, [config.foregroundColor, config.source, config.clipartName, config.padding, onIconSvg, innerSize]);

  const androidSizes = [
    { name: "mdpi", size: 48 },
    { name: "hdpi", size: 72 },
    { name: "xhdpi", size: 96 },
    { name: "xxhdpi", size: 144 },
    { name: "xxxhdpi", size: 192 },
    { name: "Play Store", size: 512 },
  ];

  const rafIdRef = useRef<number | null>(null);

  const drawNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== previewSize) {
      canvas.width = previewSize;
      canvas.height = previewSize;
    }

    ctx.clearRect(0, 0, previewSize, previewSize);

    if (config.shape !== "none") {
      ctx.save();
      const clipPath = getClipPath(config.shape, previewSize);
      ctx.clip(clipPath);

      applyCanvasBackground(ctx, config.background, previewSize, previewSize);

      ctx.fillRect(0, 0, previewSize, previewSize);
      ctx.restore();
    }

    const padding = (config.padding / 100) * previewSize;
    const innerSize = previewSize - padding * 2;

    if (config.source === "text") {
      ctx.fillStyle = config.foregroundColor;
      ctx.font = `${config.fontWeight} ${innerSize * 0.5}px "${config.fontFamily}", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const yOffset = config.fontFamily === "Bebas Neue" ? 4 : 0;
      ctx.fillText(config.text, previewSize / 2, previewSize / 2 + yOffset);
    } else if (
      config.source === "image" &&
      iconImgRef.current &&
      iconLoadedRef.current
    ) {
      ctx.drawImage(iconImgRef.current, padding, padding, innerSize, innerSize);
    } else if (
      config.source === "clipart" &&
      iconImgRef.current &&
      iconLoadedRef.current
    ) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const offCanvas = offscreenCanvasRef.current;
      if (offCanvas.width !== innerSize) {
        offCanvas.width = innerSize;
        offCanvas.height = innerSize;
      }
      const offCtx = offCanvas.getContext("2d");
      if (offCtx) {
        offCtx.clearRect(0, 0, innerSize, innerSize);
        offCtx.save();
        offCtx.drawImage(iconImgRef.current, 0, 0, innerSize, innerSize);
        offCtx.globalCompositeOperation = "source-in";
        offCtx.fillStyle = config.foregroundColor;
        offCtx.fillRect(0, 0, innerSize, innerSize);
        offCtx.restore();
        ctx.drawImage(offCanvas, padding, padding, innerSize, innerSize);
      }
    }

    smallCanvasRefs.current.forEach((smallCanvas, index) => {
      if (!smallCanvas || !canvas) return;
      const size = androidSizes[index].size;
      const sCtx = smallCanvas.getContext("2d");
      if (sCtx) {
        if (smallCanvas.width !== size) {
          smallCanvas.width = size;
          smallCanvas.height = size;
        }
        sCtx.clearRect(0, 0, size, size);
        sCtx.drawImage(canvas, 0, 0, size, size);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, canvasRef]);

  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawNow();
    });
  }, [drawNow]);

  useEffect(() => {
    scheduleDrawRef.current = scheduleDraw;
  }, [scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleDraw]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-12 min-h-0">
        <div className="relative group">
          <div className="absolute -inset-10 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <canvas
            ref={canvasRef}
            width={previewSize}
            height={previewSize}
            className="relative size-40 md:size-64 lg:size-[320px] drop-shadow-2xl transition-all duration-500 group-hover:scale-[1.03] group-hover:-rotate-1"
          />
        </div>
      </div>

      <div className="w-full px-6 pb-8 pt-2">
        <div className="max-w-4xl mx-auto flex items-end gap-6 md:gap-10 flex-wrap justify-center p-6 bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl ring-1 ring-white/10">
          {androidSizes.slice(0, 5).map(({ name, size }, index) => {
            const displaySize = Math.max(32, size / 3.5);
            return (
              <div
                key={name}
                className="flex flex-col items-center gap-2.5 group/size transition-transform hover:scale-110 duration-300"
              >
                <div className="rounded-xl p-1 bg-background/20 group-hover/size:bg-background/40 transition-colors">
                  <canvas
                    ref={(el) => {
                      smallCanvasRefs.current[index] = el;
                    }}
                    width={size}
                    height={size}
                    style={{ width: displaySize, height: displaySize }}
                    className="rounded-lg shadow-sm"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-foreground/80 font-black tracking-widest uppercase">
                    {name}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium tabular-nums opacity-60">
                    {size}px
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(IconPreview);
