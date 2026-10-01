import React, { useRef, useEffect, memo, useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import type { IconConfig, IconShape, DarkTheme } from "@/types/icon";
import { useUiIcons } from "@/lib/uiIcons";
import { DegreePicker } from "./DegreePicker";
import GradientTemplates from "./GradientTemplates";
import SidebarSection from "./SidebarSection";
import {
  solidToGradient,
  gradientToSolid,
  cssColorToHex,
  normalizeGradientColors,
} from "@/lib/color";
import { sanitizeResourceName } from "@/lib/utils";

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
      const I = useUiIcons();

      return (
        <>
          {gradientType === "linear-gradient" && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-popover border-b border-border">
              <div className="flex bg-background rounded-lg p-0.5 border border-border">
                <button
                  type="button"
                  onClick={setLinear}
                  title="Linear Gradient"
                  className={`p-1 rounded-md transition-all ${gradientType === "linear-gradient" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 20L20 4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={setRadial}
                  title="Radial Gradient"
                  className="p-1 rounded-md transition-all text-muted-foreground hover:text-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div className="w-px h-4 bg-border" />
              <DegreePicker
                size="small"
                degrees={degrees}
                onChange={setDegrees}
              />
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Stop
                </span>
                <input
                  type="number"
                  value={Math.round(currentLeft)}
                  onChange={(e) => setPointLeft(Number(e.target.value))}
                  aria-label="Gradient stop position"
                  className="ik-input w-10! px-1! text-center"
                />
                <button
                  type="button"
                  onClick={() => deletePoint(selectedPoint)}
                  title="Delete Color Stop"
                  className="p-1.5 rounded-lg bg-background border border-border text-muted-foreground hover:text-red-500 transition-all"
                >
                  <I.Trash2 size={12} />
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
            disableLightMode={false}
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

const SHAPES: { value: IconShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "squircle", label: "Squircle" },
  { value: "circle", label: "Circle" },
];

const DARK_THEMES: { value: DarkTheme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ik-row">
      <span className="ik-row-label">{label}</span>
      <div className="flex items-center justify-end gap-2 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="ik-segment">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  valueText,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  valueText?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <PropertyRow label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        className="ik-range flex-1"
      />
      <span className="text-[11px] font-bold text-primary font-mono tabular-nums min-w-[34px] text-right">
        {display}
      </span>
    </PropertyRow>
  );
}

// ---------------------------------------------------------------------------
// PopoverColorPicker (IconKitchen-style swatch + popover)
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

  const isGradient = value.toLowerCase().includes("gradient");
  // The picker library only understands rgb-style colors: rewrite any
  // hsl()/hsla() (e.g. from previously saved sessions) before handing
  // the value over, otherwise opening the popover throws.
  const displayValue = normalizeGradientColors(value);

  function computePosition() {
    if (!swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    const margin = 8;
    const estimatedHeight = popoverRef.current?.offsetHeight || 420;

    let left = rect.left + rect.width / 2 - PICKER_WIDTH / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - PICKER_WIDTH - margin));

    let top = rect.bottom + margin;
    if (top + estimatedHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - estimatedHeight - margin);
    }

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
    <div className="flex items-center gap-2 relative group">
      <div
        ref={swatchRef}
        role="button"
        tabIndex={0}
        aria-label={`Open ${label} color picker`}
        aria-expanded={isOpen}
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
        style={{ background: displayValue }}
        className="size-6 shrink-0 rounded-full border border-border cursor-pointer shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform hover:scale-110"
      />
      {!solidOnly && (
        <Segment
          value={isGradient ? "gradient" : "solid"}
          options={[
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
          ]}
          onChange={(v) => handleModeSwitch(v === "gradient")}
        />
      )}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="ik-popup-enter rounded-xl shadow-2xl overflow-hidden border border-border bg-popover"
          >
            <Suspense
              fallback={
                <div className="w-[270px] h-[300px] bg-popover flex items-center justify-center">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <LazyColorPickerPanel
                value={displayValue}
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
// Sections (content; collapsible headers are rendered by SidebarSection)
// ---------------------------------------------------------------------------

function TransformDetails({ config, onChange }: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem("android-icon-studio:section-transform") !== "closed";
    } catch {
      return true;
    }
  });
  const I = useUiIcons();
  const contentId = "sidebar-transform-details";

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          "android-icon-studio:section-transform",
          next ? "open" : "closed",
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const resetTransform = () =>
    onChange({
      foregroundScale: 1.0,
      foregroundOffsetX: 0,
      foregroundOffsetY: 0,
      foregroundRotation: 0,
    });

  const isDefault =
    config.foregroundScale === 1.0 &&
    config.foregroundOffsetX === 0 &&
    config.foregroundOffsetY === 0 &&
    config.foregroundRotation === 0;

  return (
    <div className="rounded-lg border border-border/50 bg-background/40">
      <div className="flex items-center gap-2 px-2 py-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex flex-1 items-center gap-1.5 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Transform
          {open ? (
            <I.ChevronDown size={13} className="shrink-0" aria-hidden />
          ) : (
            <I.ChevronRight size={13} className="shrink-0" aria-hidden />
          )}
          {!isDefault && (
            <span className="size-1.5 rounded-full bg-primary shrink-0" aria-label="Modified" />
          )}
        </button>
        {!isDefault && (
          <button
            type="button"
            onClick={resetTransform}
            title="Reset transform"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors"
          >
            <I.RotateCcw size={10} aria-hidden />
            Reset
          </button>
        )}
      </div>
      <div
        id={contentId}
        role="region"
        aria-label="Transform"
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0" inert={!open}>
          <div className="space-y-1 px-2 pb-2">
            <SliderRow
              label="Scale"
              value={config.foregroundScale}
              display={config.foregroundScale.toFixed(2)}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(v) => onChange({ foregroundScale: v })}
            />
            <SliderRow
              label="Offset X"
              value={config.foregroundOffsetX}
              display={`${config.foregroundOffsetX}%`}
              valueText={`${config.foregroundOffsetX}%`}
              min={-50}
              max={50}
              step={1}
              onChange={(v) => onChange({ foregroundOffsetX: v })}
            />
            <SliderRow
              label="Offset Y"
              value={config.foregroundOffsetY}
              display={`${config.foregroundOffsetY}%`}
              valueText={`${config.foregroundOffsetY}%`}
              min={-50}
              max={50}
              step={1}
              onChange={(v) => onChange({ foregroundOffsetY: v })}
            />
            <SliderRow
              label="Rotation"
              value={config.foregroundRotation}
              display={`${config.foregroundRotation}°`}
              valueText={`${config.foregroundRotation}°`}
              min={0}
              max={360}
              step={1}
              onChange={(v) => onChange({ foregroundRotation: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ForegroundSection({ config, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <PropertyRow label="Icon Color">
        <PopoverColorPicker
          label="Icon"
          value={config.foregroundColor}
          onChange={(color) => onChange({ foregroundColor: cssColorToHex(color) })}
          solidOnly
          idSuffix="fg"
        />
      </PropertyRow>

      <SliderRow
        label="Padding"
        value={config.padding}
        display={`${config.padding}%`}
        valueText={`${config.padding}%`}
        min={0}
        max={45}
        step={1}
        onChange={(padding) => onChange({ padding })}
      />

      <TransformDetails config={config} onChange={onChange} />
    </div>
  );
}

function BackgroundSection({ config, onChange }: Props) {
  // Templates only make sense in gradient mode. Same detection
  // as PopoverColorPicker so Segment and templates stay in sync.
  const isBackgroundGradient =
    config.background?.toLowerCase().includes("gradient") ?? false;

  return (
    <div className="space-y-1">
      <PropertyRow label="Color">
        <PopoverColorPicker
          label="Background"
          value={config.background}
          onChange={(color) => onChange({ background: color })}
          idSuffix="bg"
        />
      </PropertyRow>
      {isBackgroundGradient && (
        <GradientTemplates
          current={config.background}
          onSelect={(background) => onChange({ background })}
        />
      )}
      <PropertyRow label="Shape">
        <Segment
          value={config.shape}
          options={SHAPES}
          onChange={(shape) => onChange({ shape: shape as IconShape })}
        />
      </PropertyRow>
    </div>
  );
}

function MoreContent({ config, onChange }: Props) {
  return (
        <div className="space-y-1">
          <PropertyRow label="Filename">
            <input
              value={config.filename}
              onChange={(e) => {
                // Mirror the export sanitization (lowercase, [a-z0-9_],
                // must start with a letter). Empty is kept transiently so
                // the field stays clearable; export falls back to ic_launcher.
                const raw = e.target.value;
                onChange({
                  filename: raw === "" ? "" : sanitizeResourceName(raw),
                });
              }}
              placeholder="ic_launcher"
              spellCheck={false}
              className="ik-input"
            />
          </PropertyRow>
          <PropertyRow label="Dark theme">
            <Segment
              value={config.darkTheme}
              options={DARK_THEMES}
              onChange={(v) => onChange({ darkTheme: v as DarkTheme })}
            />
          </PropertyRow>
          <PropertyRow label="Themed">
            <button
              type="button"
              role="switch"
              aria-checked={config.monochromeEnabled}
              onClick={() =>
                onChange({ monochromeEnabled: !config.monochromeEnabled })
              }
              className={`relative inline-flex h-[18px] w-8 items-center rounded-full transition-colors ${
                config.monochromeEnabled ? "bg-primary" : "bg-muted/40 border border-border"
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                  config.monochromeEnabled ? "translate-x-[16px]" : "translate-x-[1px]"
                }`}
              />
            </button>
          </PropertyRow>
          {config.monochromeEnabled && (
            <PropertyRow label="Monochrome">
              <PopoverColorPicker
                label="Monochrome"
                value={config.monochromeColor}
                onChange={(color) =>
                  onChange({ monochromeColor: cssColorToHex(color) })
                }
                solidOnly
                idSuffix="mono"
              />
            </PropertyRow>
          )}
        </div>
  );
}

// ---------------------------------------------------------------------------
// Main component: compact accordion (M3 progressive disclosure) so the
// sidebar fits without scrolling. State persists in localStorage.
// ---------------------------------------------------------------------------

function IconCustomizer({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <SidebarSection id="foreground" title="Foreground" defaultOpen>
        <ForegroundSection config={config} onChange={onChange} />
      </SidebarSection>
      <SidebarSection id="background" title="Background" defaultOpen>
        <BackgroundSection config={config} onChange={onChange} />
      </SidebarSection>
      <SidebarSection id="more" title="More" defaultOpen={false}>
        <MoreContent config={config} onChange={onChange} />
      </SidebarSection>
    </div>
  );
}

export default memo(IconCustomizer);
