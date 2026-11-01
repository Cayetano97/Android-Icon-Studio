import { memo, useId, useState } from "react";
import type { IconConfig, IconShape } from "@/types/icon";
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

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function TransformDetails({ config, onChange }: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return (
        window.localStorage.getItem(
          "android-icon-studio:section-transform",
        ) !== "closed"
      );
    } catch {
      return true;
    }
  });
  const I = useUiIcons();
  const uid = useId();
  const contentId = `transform-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;

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
    <div className="rounded-lg border border-border/70 bg-background/40">
      <div className="flex items-center gap-2 px-2.5 py-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex flex-1 items-center gap-1.5 rounded py-1.5 text-left text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Transform
          {open ? (
            <I.ChevronDown size={13} aria-hidden className="shrink-0" />
          ) : (
            <I.ChevronRight size={13} aria-hidden className="shrink-0" />
          )}
          {!isDefault && (
            <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Modified</span>
            </span>
          )}
        </button>
        {!isDefault && (
          <button
            type="button"
            onClick={resetTransform}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <I.RotateCcw size={11} aria-hidden />
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
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="space-y-0.5 px-2.5 pb-2.5">
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
      <PropertyRow label="Icon color">
        <PopoverColorPicker
          label="Icon color"
          value={config.foregroundColor}
          onChange={(color) =>
            onChange({ foregroundColor: cssColorToHex(color) })
          }
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
          label="Background shape"
        />
      </PropertyRow>
    </div>
  );
}

function AdvancedContent({ config, onChange }: Props) {
  return (
    <div className="space-y-1">
      <PropertyRow label="Filename">
        <input
          value={config.filename}
          onChange={(e) => {
            // Mirror the export sanitization (lowercase, [a-z0-9_], must
            // start with a letter). Empty is kept transiently so the field
            // stays clearable; export falls back to ic_launcher.
            const raw = e.target.value;
            onChange({
              filename: raw === "" ? "" : sanitizeResourceName(raw),
            });
          }}
          placeholder="ic_launcher"
          aria-label="Export file name"
          spellCheck={false}
          autoComplete="off"
          className="ik-input"
        />
      </PropertyRow>
      <PropertyRow label="Themed">
        <button
          type="button"
          role="switch"
          aria-checked={config.monochromeEnabled}
          aria-label="Themed icon"
          onClick={() =>
            onChange({ monochromeEnabled: !config.monochromeEnabled })
          }
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel ${
            config.monochromeEnabled
              ? "bg-primary"
              : "border border-input bg-muted/50"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              config.monochromeEnabled ? "translate-x-[24px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </PropertyRow>
      {config.monochromeEnabled && (
        <PropertyRow label="Monochrome">
          <PopoverColorPicker
            label="Monochrome color"
            value={config.monochromeColor}
            onChange={(color) =>
              onChange({ monochromeColor: cssColorToHex(color) })
            }
            solidOnly
            idSuffix="mono"
          />
        </PropertyRow>
      )}
      <p className="pt-1 text-[11px] leading-4 text-muted-foreground">
        Exports a ZIP with adaptive layers, legacy PNGs, Play Store assets, SVG
        and a vector drawable.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function IconCustomizer({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      <SidebarSection id="foreground" title="Foreground" defaultOpen>
        <ForegroundSection config={config} onChange={onChange} />
      </SidebarSection>
      <SidebarSection id="background" title="Background" defaultOpen>
        <BackgroundSection config={config} onChange={onChange} />
      </SidebarSection>
      <SidebarSection id="advanced" title="Advanced" defaultOpen={false}>
        <AdvancedContent config={config} onChange={onChange} />
      </SidebarSection>
    </div>
  );
}

export default memo(IconCustomizer);
