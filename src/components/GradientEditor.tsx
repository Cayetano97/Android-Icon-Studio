import { memo, useMemo } from "react";
import { useUiIcons } from "@/lib/uiIcons";
import {
  applyTwoColors,
  extractTwoColors,
  getGradientAngle,
  getGradientType,
  setGradientAngle,
  setGradientType,
} from "@/lib/gradientPatterns";
import PopoverColorPicker from "./ColorPopover";
import GradientTemplates from "./GradientTemplates";
import { PropertyRow, Segment, SliderRow } from "./fields";

interface Props {
  current: string;
  onSelect: (css: string) => void;
}

const TYPE_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
];

/**
 * First-class gradient editor shown inline in the Background section, so
 * type / angle / colors no longer hide behind the color swatch popover
 * (which now acts as the advanced multi-stop editor).
 */
function GradientEditor({ current, onSelect }: Props) {
  const I = useUiIcons();
  const { c1, c2 } = useMemo(() => extractTwoColors(current), [current]);
  const type = getGradientType(current) ?? "linear";
  const angle = getGradientAngle(current) ?? 135;

  return (
    <div className="space-y-1">
      <PropertyRow label="Type">
        <Segment
          value={type}
          options={TYPE_OPTIONS}
          onChange={(v) => onSelect(setGradientType(current, v as "linear" | "radial"))}
        />
      </PropertyRow>

      {type === "linear" && (
        <SliderRow
          label="Angle"
          value={angle}
          display={`${Math.round(angle)}°`}
          valueText={`${Math.round(angle)} degrees`}
          min={0}
          max={360}
          step={1}
          onChange={(v) => onSelect(setGradientAngle(current, v))}
        />
      )}

      <PropertyRow label="Colors">
        <div className="flex items-center gap-1.5 min-w-0">
          <PopoverColorPicker
            label="Gradient color A"
            badge="A"
            value={c1}
            onChange={(color) => onSelect(applyTwoColors(current, color, c2))}
            solidOnly
            idSuffix="grad-a"
          />
          <button
            type="button"
            onClick={() => onSelect(applyTwoColors(current, c2, c1))}
            title="Swap colors A and B"
            aria-label="Swap colors A and B"
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all"
          >
            <I.ArrowRightLeft size={14} aria-hidden />
          </button>
          <PopoverColorPicker
            label="Gradient color B"
            badge="B"
            value={c2}
            onChange={(color) => onSelect(applyTwoColors(current, c1, color))}
            solidOnly
            idSuffix="grad-b"
          />
        </div>
      </PropertyRow>

      <GradientTemplates current={current} onSelect={onSelect} />
    </div>
  );
}

export default memo(GradientEditor);
