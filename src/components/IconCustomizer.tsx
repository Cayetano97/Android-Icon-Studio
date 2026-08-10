import React, { useRef, useEffect, memo, useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { IconConfig, IconShape } from "@/types/icon";
import {
  Circle,
  Square,
  RectangleHorizontal,
  Ban,
  ArrowUpRight,
  CircleDot,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { DegreePicker } from "./DegreePicker";
import { solidToGradient, gradientToSolid, cssColorToHex } from "@/lib/color";

const LazyColorPickerPanel = lazy(() =>
  import("react-best-gradient-color-picker").then((m) => {
    const ColorPicker = m.default;
    const useColorPicker = m.useColorPicker;

    function ColorPickerPanel({
      value,
      onChange,
      idSuffix,
    }: {
      value: string;
      onChange: (c: string) => void;
      idSuffix: string;
    }) {
      const {
        degrees,
        setDegrees,
        gradientType,
        setLinear,
        setRadial,
        selectedPoint,
        deletePoint,
        currentLeft,
        setPointLeft,
      } = useColorPicker(value, onChange);

      return (
        <>
          {gradientType === "linear-gradient" && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border-b border-white/10">
              <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-white/5">
                <button
                  type="button"
                  onClick={setLinear}
                  title="Linear Gradient"
                  className={`p-1 rounded-md transition-all ${gradientType === "linear-gradient" ? "bg-zinc-700 text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <ArrowUpRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={setRadial}
                  title="Radial Gradient"
                  className={`p-1 rounded-md transition-all ${gradientType === "radial-gradient" ? "bg-zinc-700 text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <CircleDot size={14} />
                </button>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <DegreePicker
                size="small"
                degrees={degrees}
                onChange={setDegrees}
              />
              <div className="w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                  Stop
                </span>
                <input
                  type="number"
                  value={Math.round(currentLeft)}
                  onChange={(e) => setPointLeft(Number(e.target.value))}
                  className="w-10 bg-zinc-800 border border-white/5 rounded px-1 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:border-primary/50 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => deletePoint(selectedPoint)}
                  title="Delete Color Stop"
                  className="p-1.5 rounded-lg bg-zinc-800 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}

          <ColorPicker
            value={value}
            onChange={onChange}
            width={250}
            hideColorTypeBtns={true}
            hideControls={true}
            hidePresets={false}
            hideEyeDrop={false}
            hideAdvancedSliders={true}
            hideColorGuide={true}
            hideInputType={true}
            disableLightMode={true}
            idSuffix={idSuffix}
          />
        </>
      );
    }

    return { default: ColorPickerPanel };
  }),
);

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
}

const shapes: { value: IconShape; label: string; icon: typeof Circle }[] = [
  { value: "circle", label: "Circle", icon: Circle },
  { value: "squircle", label: "Squircle", icon: RectangleHorizontal },
  { value: "square", label: "Square", icon: Square },
  { value: "none", label: "None", icon: Ban },
];

// ---------------------------------------------------------------------------
// PopoverColorPicker
// ---------------------------------------------------------------------------
interface PopoverColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  solidOnly?: boolean;
  idSuffix: string;
}

const PICKER_WIDTH = 270;

function PopoverColorPicker({
  label,
  value,
  onChange,
  solidOnly,
  idSuffix,
}: PopoverColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const swatchRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isGradient = value.includes("gradient");

  function computePosition() {
    if (!swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    const margin = 8;
    const sidebarWidth = 384;
    const isDesktop = window.innerWidth >= 1024;

    let left;
    if (isDesktop) {
      left = sidebarWidth + margin;
    } else {
      left = rect.left;
      if (left + PICKER_WIDTH > window.innerWidth - margin) {
        left = rect.right - PICKER_WIDTH;
      }
    }
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - PICKER_WIDTH - margin),
    );

    let top;
    const height = popoverRef.current?.offsetHeight || 450;
    if (isDesktop) {
      top = rect.top + rect.height / 2 - height / 2;
    } else {
      top = rect.bottom + margin;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    setPopoverStyle({
      position: "fixed",
      top,
      left,
      width: PICKER_WIDTH,
      zIndex: 9999,
    });
  }

  useEffect(() => {
    if (!isOpen) return;
    computePosition();
    const timer = setTimeout(computePosition, 0);
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        swatchRef.current &&
        !swatchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        swatchRef.current?.focus();
      }
    }
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function handleModeSwitch(toGradient: boolean) {
    if (toGradient === isGradient) return;
    if (toGradient) {
      onChange(solidToGradient(value));
    } else {
      onChange(gradientToSolid(value));
    }
  }

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-3 rounded-2xl flex flex-col items-center gap-1.5 group relative">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>

      <div
        ref={swatchRef}
        style={{ background: value }}
        className="size-10 rounded-xl border border-border/40 shadow-inner cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => {
          if (!isOpen) computePosition();
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isOpen) computePosition();
            setIsOpen((prev) => !prev);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        aria-label={`Open ${label} color picker`}
      />

      {!solidOnly && (
        <div className="flex items-center bg-background/50 border border-border/40 rounded-full p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => handleModeSwitch(false)}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
              !isGradient
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch(true)}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
              isGradient
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gradient
          </button>
        </div>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="rounded-2xl shadow-2xl overflow-hidden border border-white/10"
          >
            <Suspense
              fallback={
                <div className="w-[270px] h-[300px] bg-zinc-900 flex items-center justify-center">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <LazyColorPickerPanel
                value={value}
                onChange={onChange}
                idSuffix={idSuffix}
              />
            </Suspense>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function IconCustomizer({ config, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <div className="space-y-3 relative z-40">
        <div className="grid grid-cols-2 gap-3">
          <PopoverColorPicker
            label="Icon Color"
            value={config.foregroundColor}
            onChange={(color) => onChange({ foregroundColor: cssColorToHex(color) })}
            solidOnly
            idSuffix="fg"
          />
          <PopoverColorPicker
            label="Background"
            value={config.background}
            onChange={(color) => onChange({ background: color })}
            idSuffix="bg"
          />
        </div>
      </div>

      {/* Shape Section */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-4 rounded-2xl space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
          Container Shape
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {shapes.map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() => onChange({ shape: value })}
              className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all border ${
                config.shape === value
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsla(var(--primary),0.4)] scale-105"
                  : "bg-background/40 text-muted-foreground border-border/50 hover:bg-accent/40"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Foreground Position */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Foreground Position
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                foregroundScale: 1.0,
                foregroundOffsetX: 0,
                foregroundOffsetY: 0,
                foregroundRotation: 0,
              })
            }
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <RotateCcw size={10} />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Scale
            </span>
            <span className="text-xs font-mono text-primary font-bold">
              {config.foregroundScale.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={config.foregroundScale}
            onChange={(e) =>
              onChange({ foregroundScale: parseFloat(e.target.value) })
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Offset X
            </span>
            <span className="text-xs font-mono text-primary font-bold">
              {config.foregroundOffsetX}%
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={config.foregroundOffsetX}
            onChange={(e) =>
              onChange({ foregroundOffsetX: parseInt(e.target.value) })
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Offset Y
            </span>
            <span className="text-xs font-mono text-primary font-bold">
              {config.foregroundOffsetY}%
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={config.foregroundOffsetY}
            onChange={(e) =>
              onChange({ foregroundOffsetY: parseInt(e.target.value) })
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Rotation
            </span>
            <span className="text-xs font-mono text-primary font-bold">
              {config.foregroundRotation}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={config.foregroundRotation}
            onChange={(e) =>
              onChange({ foregroundRotation: parseInt(e.target.value) })
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Themed Icon (Android 13+) */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Themed Icon (Android 13+)
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={config.monochromeEnabled}
            onClick={() =>
              onChange({ monochromeEnabled: !config.monochromeEnabled })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.monochromeEnabled
                ? "bg-primary"
                : "bg-muted border border-border/60"
            }`}
          >
            <span
              className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
                config.monochromeEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
          Exports a monochrome vector drawable for Android 13+ themed icons.
        </p>

        {config.monochromeEnabled && (
          <div className="relative z-40">
            <PopoverColorPicker
              label="Monochrome Color"
              value={config.monochromeColor}
              onChange={(color) =>
                onChange({ monochromeColor: cssColorToHex(color) })
              }
              solidOnly
              idSuffix="mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(IconCustomizer);
