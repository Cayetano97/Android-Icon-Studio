import { memo, useState } from "react";
import type { IconConfig, IconShape, DarkTheme } from "@/types/icon";
import { useUiIcons } from "@/lib/uiIcons";
import GradientEditor from "./GradientEditor";
import SidebarSection from "./SidebarSection";
import PopoverColorPicker from "./ColorPopover";
import { PropertyRow, Segment, SliderRow } from "./fields";
import { cssColorToHex } from "@/lib/color";
import { sanitizeResourceName } from "@/lib/utils";

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
  // The inline gradient editor only makes sense in gradient mode. Same
  // detection as PopoverColorPicker so the segment and the editor stay in sync.
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
        <GradientEditor
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
