import type { ReactNode } from "react";

/**
 * Shared sidebar form primitives (IconKitchen-style rows). They are used by
 * the icon customizer itself and by the gradient editor, so both stay
 * visually identical without duplicating markup.
 */

export function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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

export function Segment({
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

export function SliderRow({
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
