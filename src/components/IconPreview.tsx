import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { IconConfig, GradientConfig } from '@/types/icon';
import * as LucideIcons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface Props {
  config: IconConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function getClipPath(shape: IconConfig['shape'], size: number): Path2D {
  const path = new Path2D();
  const r = size / 2;
  if (shape === 'circle') {
    path.arc(r, r, r, 0, Math.PI * 2);
  } else if (shape === 'square') {
    const radius = size * 0.08;
    path.roundRect(0, 0, size, size, radius);
  } else if (shape === 'squircle') {
    const radius = size * 0.22;
    path.roundRect(0, 0, size, size, radius);
  }
  return path;
}

/** Converts a GradientConfig into a CanvasGradient for the given context/size. */
function buildCanvasGradient(
  ctx: CanvasRenderingContext2D,
  gradient: GradientConfig,
  size: number
): CanvasGradient {
  const directionMap: Record<string, [number, number, number, number]> = {
    'to bottom':       [size / 2, 0,      size / 2, size],
    'to top':          [size / 2, size,   size / 2, 0],
    'to right':        [0,        size / 2, size,   size / 2],
    'to bottom right': [0, 0, size, size],
    'to bottom left':  [size, 0, 0, size],
    'to top right':    [0, size, size, 0],
  };
  const [x0, y0, x1, y1] = directionMap[gradient.direction] ?? [0, 0, size, size];
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  // Sort stops ascending — CanvasGradient requires offsets in order 0→1
  const sorted = [...gradient.stops].sort((a, b) => a.position - b.position);
  for (const stop of sorted) {
    grad.addColorStop(stop.position / 100, stop.color);
  }
  return grad;
}

function IconPreview({ config, canvasRef }: Props) {
  const previewSize = 512;
  const iconImgRef = useRef<HTMLImageElement | null>(null);
  const [isIconLoaded, setIsIconLoaded] = useState(false);
  const lastClipartRef = useRef<string | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smallCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Pre-load icon, image or font for efficient rendering
  useEffect(() => {
    if (config.source === 'clipart') {
      if (lastClipartRef.current === config.clipartName && iconImgRef.current) return;

      const Icon = (LucideIcons as any)[config.clipartName];
      if (Icon) {
        setIsIconLoaded(false);
        try {
          const svgMarkup = renderToStaticMarkup(
            <Icon size={previewSize} color="#000000" strokeWidth={1.5} />
          );
          const img = new Image();
          const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          img.onload = () => {
            iconImgRef.current = img;
            lastClipartRef.current = config.clipartName;
            setIsIconLoaded(true);
            URL.revokeObjectURL(url);
          };
          img.src = url;
        } catch (e) {
          console.error(`Error loading clipart mask:`, e);
        }
      }
    } else if (config.source === 'image' && config.imageDataUrl) {
      if (lastClipartRef.current === config.imageDataUrl && iconImgRef.current) return;

      setIsIconLoaded(false);
      const img = new Image();
      img.onload = () => {
        iconImgRef.current = img;
        lastClipartRef.current = config.imageDataUrl;
        setIsIconLoaded(true);
      };
      img.src = config.imageDataUrl;
    } else if (config.source === 'text') {
      const fontUrl = `https://fonts.googleapis.com/css2?family=${config.fontFamily.replace(/ /g, '+')}:wght@${config.fontWeight}&display=swap`;

      let link = document.getElementById('google-font-link') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = 'google-font-link';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      if (link.href !== fontUrl) {
        setIsIconLoaded(false);
        link.href = fontUrl;

        document.fonts.load(`${config.fontWeight} 16px "${config.fontFamily}"`).then(() => {
          setIsIconLoaded(true);
        }).catch((err) => {
          console.error('Font loading failed:', err);
          setIsIconLoaded(true);
        });
      } else {
        setIsIconLoaded(true);
      }
    } else {
      iconImgRef.current = null;
      lastClipartRef.current = null;
      setIsIconLoaded(false);
    }
  }, [config.clipartName, config.source, config.imageDataUrl, config.fontFamily, config.fontWeight]);

  const rafIdRef = useRef<number | null>(null);

  const drawNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== previewSize) {
      canvas.width = previewSize;
      canvas.height = previewSize;
    }

    ctx.clearRect(0, 0, previewSize, previewSize);

    if (config.shape !== 'none') {
      ctx.save();
      const clipPath = getClipPath(config.shape, previewSize);
      ctx.clip(clipPath);

      if (config.gradient.enabled && config.gradient.stops.length >= 2) {
        ctx.fillStyle = buildCanvasGradient(ctx, config.gradient, previewSize);
      } else {
        ctx.fillStyle = config.backgroundColor;
      }

      ctx.fillRect(0, 0, previewSize, previewSize);
      ctx.restore();
    }

    const padding = (config.padding / 100) * previewSize;
    const innerSize = previewSize - padding * 2;

    if (config.source === 'text') {
      ctx.fillStyle = config.foregroundColor;
      ctx.font = `${config.fontWeight} ${innerSize * 0.5}px "${config.fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const yOffset = config.fontFamily === 'Bebas Neue' ? 4 : 0;
      ctx.fillText(config.text, previewSize / 2, (previewSize / 2) + yOffset);
    } else if (config.source === 'image' && iconImgRef.current && isIconLoaded) {
      ctx.drawImage(iconImgRef.current, padding, padding, innerSize, innerSize);
    } else if (config.source === 'clipart' && iconImgRef.current && isIconLoaded) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const offCanvas = offscreenCanvasRef.current;
      if (offCanvas.width !== innerSize) {
        offCanvas.width = innerSize;
        offCanvas.height = innerSize;
      }
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.clearRect(0, 0, innerSize, innerSize);
        offCtx.save();
        offCtx.drawImage(iconImgRef.current, 0, 0, innerSize, innerSize);
        offCtx.globalCompositeOperation = 'source-in';
        offCtx.fillStyle = config.foregroundColor;
        offCtx.fillRect(0, 0, innerSize, innerSize);
        offCtx.restore();
        ctx.drawImage(offCanvas, padding, padding, innerSize, innerSize);
      }
    }

    smallCanvasRefs.current.forEach((smallCanvas, index) => {
      if (!smallCanvas || !canvas) return;
      const size = androidSizes[index].size;
      const sCtx = smallCanvas.getContext('2d');
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
  }, [config, canvasRef, isIconLoaded]);

  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawNow();
    });
  }, [drawNow]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleDraw]);

  const androidSizes = [
    { name: 'mdpi', size: 48 },
    { name: 'hdpi', size: 72 },
    { name: 'xhdpi', size: 96 },
    { name: 'xxhdpi', size: 144 },
    { name: 'xxxhdpi', size: 192 },
    { name: 'Play Store', size: 512 },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-12 py-8">
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <canvas
            ref={canvasRef}
            width={previewSize}
            height={previewSize}
            className="relative w-64 h-64 md:w-80 md:h-80 drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>

        <div className="flex items-end gap-6 flex-wrap justify-center p-6 bg-accent/30 backdrop-blur-sm rounded-3xl border border-border/50">
          {androidSizes.slice(0, 5).map(({ name, size }, index) => {
            const displaySize = Math.max(32, size / 3.5);
            return (
              <div key={name} className="flex flex-col items-center gap-2 group/size">
                <div className="rounded-xl p-1 group-hover/size:border-primary/30 transition-colors">
                  <canvas
                    ref={(el) => { smallCanvasRefs.current[index] = el; }}
                    width={size}
                    height={size}
                    style={{ width: displaySize, height: displaySize }}
                    className="rounded-lg shadow-inner"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] text-foreground font-bold tracking-tight uppercase">{name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{size}px</span>
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
