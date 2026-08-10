import { useRef, useEffect, useCallback, memo } from "react";
import { IconConfig } from "@/types/icon";
import { renderToStaticMarkup } from "react-dom/server";
import { loadIcon } from "@/lib/lucideIcons";
import { cssColorToHex } from "@/lib/color";
import { androidSizesDisplay } from "@/lib/constants";
import { applyCanvasBackground } from "@/lib/canvasGradient";

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

function IconPreview({ config, canvasRef, onIconSvg }: Props) {
  const previewSize = 512;
  const padding = (config.padding / 100) * previewSize;
  const innerSize = previewSize - padding * 2;
  const iconImgRef = useRef<HTMLImageElement | null>(null);
  const iconLoadedRef = useRef(false);
  const lastClipartRef = useRef<string | null>(null);
  const lastColorRef = useRef<string>("");
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smallCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const scheduleDrawRef = useRef<(() => void) | null>(null);
  const monochromeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (config.source === "clipart") {
      if (lastClipartRef.current === config.clipartName && iconImgRef.current)
        return;

      const Icon = loadIcon(config.clipartName);
      if (Icon) {
        iconLoadedRef.current = false;
        try {
          const svgMarkup = renderToStaticMarkup(
            <Icon size={previewSize} color="#000000" strokeWidth={1.5} />,
          );

          const exportSvg = renderToStaticMarkup(
            <Icon
              size={innerSize}
              color={cssColorToHex(config.foregroundColor)}
              strokeWidth={1.5}
            />,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.clipartName, config.source, config.imageDataUrl, config.fontFamily, config.fontWeight, onIconSvg]);

  useEffect(() => {
    if (config.source !== "clipart") return;
    const Icon = loadIcon(config.clipartName);
    if (!Icon) return;
    const exportSvg = renderToStaticMarkup(
      <Icon
        size={innerSize}
        color={cssColorToHex(config.foregroundColor)}
        strokeWidth={1.5}
      />,
    );
    onIconSvg?.(exportSvg);
  }, [
    config.foregroundColor,
    config.source,
    config.clipartName,
    config.padding,
    onIconSvg,
    innerSize,
  ]);

  const rafIdRef = useRef<number | null>(null);
  const lastConfigHashRef = useRef<string>("");

  const drawNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (canvas.width !== previewSize) {
      canvas.width = previewSize;
      canvas.height = previewSize;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, previewSize, previewSize);

    if (config.shape !== "none") {
      ctx.save();
      const clipPath = getClipPath(config.shape, previewSize);
      ctx.clip(clipPath);
      applyCanvasBackground(ctx, config.background, previewSize, previewSize);
      ctx.fillRect(0, 0, previewSize, previewSize);
      ctx.restore();
    }

    const pad = (config.padding / 100) * previewSize;
    const inner = previewSize - pad * 2;
    const centerX = previewSize / 2;
    const centerY = previewSize / 2;

    const offsetX = (config.foregroundOffsetX / 100) * inner;
    const offsetY = (config.foregroundOffsetY / 100) * inner;
    const scale = config.foregroundScale;
    const rotation = (config.foregroundRotation * Math.PI) / 180;

    ctx.save();
    ctx.translate(centerX + offsetX, centerY + offsetY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    if (config.source === "text") {
      ctx.fillStyle = config.foregroundColor;
      ctx.font = `${config.fontWeight} ${inner * 0.5}px "${config.fontFamily}", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const yOffset = config.fontFamily === "Bebas Neue" ? 4 : 0;
      ctx.fillText(config.text, previewSize / 2, previewSize / 2 + yOffset);
    } else if (
      config.source === "image" &&
      iconImgRef.current &&
      iconLoadedRef.current
    ) {
      ctx.drawImage(iconImgRef.current, pad, pad, inner, inner);
    } else if (
      config.source === "clipart" &&
      iconImgRef.current &&
      iconLoadedRef.current
    ) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const offCanvas = offscreenCanvasRef.current;
      if (offCanvas.width !== inner) {
        offCanvas.width = inner;
        offCanvas.height = inner;
      }
      const offCtx = offCanvas.getContext("2d");
      if (offCtx) {
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = "high";
        offCtx.clearRect(0, 0, inner, inner);
        offCtx.save();
        offCtx.drawImage(iconImgRef.current, 0, 0, inner, inner);
        offCtx.globalCompositeOperation = "source-in";
        offCtx.fillStyle = config.foregroundColor;
        offCtx.fillRect(0, 0, inner, inner);
        offCtx.restore();
        ctx.drawImage(offCanvas, pad, pad, inner, inner);
      }
    }

    ctx.restore();

    // Small canvases — only redraw if config changed
    const configHash = JSON.stringify({
      background: config.background,
      shape: config.shape,
      padding: config.padding,
      source: config.source,
      clipartName: config.clipartName,
      foregroundColor: config.foregroundColor,
      text: config.text,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      imageDataUrl: config.imageDataUrl,
      foregroundScale: config.foregroundScale,
      foregroundOffsetX: config.foregroundOffsetX,
      foregroundOffsetY: config.foregroundOffsetY,
      foregroundRotation: config.foregroundRotation,
    });
    if (configHash !== lastConfigHashRef.current) {
      lastConfigHashRef.current = configHash;
      smallCanvasRefs.current.forEach((smallCanvas, index) => {
        if (!smallCanvas || !canvas) return;
        const size = androidSizesDisplay[index]?.size;
        if (!size) return;
        const sCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
        if (sCtx) {
          if (smallCanvas.width !== size) {
            smallCanvas.width = size;
            smallCanvas.height = size;
          }
          sCtx.imageSmoothingEnabled = true;
          sCtx.imageSmoothingQuality = "high";
          sCtx.clearRect(0, 0, size, size);
          sCtx.drawImage(canvas, 0, 0, size, size);
        }
      });
    }

    // Monochrome preview
    if (config.monochromeEnabled && monochromeCanvasRef.current) {
      const monoCanvas = monochromeCanvasRef.current;
      const monoCtx = monoCanvas.getContext("2d", { willReadFrequently: true });
      if (monoCtx) {
        const monoSize = 64;
        if (monoCanvas.width !== monoSize) {
          monoCanvas.width = monoSize;
          monoCanvas.height = monoSize;
        }
        monoCtx.imageSmoothingEnabled = true;
        monoCtx.imageSmoothingQuality = "high";
        monoCtx.clearRect(0, 0, monoSize, monoSize);

        // Draw the shape with monochrome color
        if (config.shape !== "none") {
          monoCtx.save();
          const clipPath = getClipPath(config.shape, monoSize);
          monoCtx.clip(clipPath);
          monoCtx.fillStyle = config.monochromeColor;
          monoCtx.fillRect(0, 0, monoSize, monoSize);
          monoCtx.restore();
        }

        // Draw foreground in dark color
        const mPad = (config.padding / 100) * monoSize;
        const mInner = monoSize - mPad * 2;
        const mCX = monoSize / 2;
        const mCY = monoSize / 2;
        const mOffX = (config.foregroundOffsetX / 100) * mInner;
        const mOffY = (config.foregroundOffsetY / 100) * mInner;

        monoCtx.save();
        monoCtx.translate(mCX + mOffX, mCY + mOffY);
        monoCtx.rotate(rotation);
        monoCtx.scale(scale, scale);
        monoCtx.translate(-mCX, -mCY);

        if (config.source === "text") {
          monoCtx.fillStyle = "#1a1a1a";
          monoCtx.font = `${config.fontWeight} ${mInner * 0.5}px "${config.fontFamily}", sans-serif`;
          monoCtx.textAlign = "center";
          monoCtx.textBaseline = "middle";
          monoCtx.fillText(config.text, mCX, mCY);
        } else if (config.source === "clipart" && iconImgRef.current && iconLoadedRef.current) {
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement("canvas");
          }
          const offCanvas = offscreenCanvasRef.current;
          if (offCanvas.width !== mInner) {
            offCanvas.width = mInner;
            offCanvas.height = mInner;
          }
          const offCtx = offCanvas.getContext("2d");
          if (offCtx) {
            offCtx.clearRect(0, 0, mInner, mInner);
            offCtx.drawImage(iconImgRef.current, 0, 0, mInner, mInner);
            offCtx.globalCompositeOperation = "source-in";
            offCtx.fillStyle = "#1a1a1a";
            offCtx.fillRect(0, 0, mInner, mInner);
            monoCtx.drawImage(offCanvas, mPad, mPad, mInner, mInner);
          }
        } else if (config.source === "image" && iconImgRef.current && iconLoadedRef.current) {
          monoCtx.drawImage(iconImgRef.current, mPad, mPad, mInner, mInner);
        }
        monoCtx.restore();
      }
    }

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
        {config.monochromeEnabled && (
          <div className="flex flex-col items-center gap-1.5 ml-4">
            <canvas
              ref={monochromeCanvasRef}
              width={64}
              height={64}
              className="size-16 rounded-lg border border-border/40"
            />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Themed
            </span>
          </div>
        )}
      </div>

      <div className="w-full px-6 pb-8 pt-2">
        <div className="max-w-4xl mx-auto flex items-end gap-6 md:gap-10 flex-wrap justify-center p-6 bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl ring-1 ring-white/10">
          {androidSizesDisplay.slice(0, 5).map(({ name, size }, index) => {
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
