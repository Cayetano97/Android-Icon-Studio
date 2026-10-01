import { memo, useMemo, useState } from "react";
import {
  GRADIENT_PATTERNS,
  extractTwoColors,
  normCss,
  replaceEdgeColors,
  toRgba,
} from "@/lib/gradientPatterns";
import { cssColorToHex } from "@/lib/color";

interface Props {
  current: string;
  onSelect: (css: string) => void;
}

function toHexInput(rgba: string): string {
  const hex = cssColorToHex(rgba);
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#6366f1";
}

function GradientTemplates({ current, onSelect }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  // Collapsible template grid by default: keeps the sidebar from growing
  // ~200px when switching to gradient and losing the no-scroll fit (M3 disclosure).
  const [showPatterns, setShowPatterns] = useState(false);

  // The two base colors come from the current background (first/last stop).
  const { c1, c2 } = useMemo(() => extractTwoColors(current), [current]);

  const activeId = useMemo(() => {
    const norm = normCss(current);
    return (
      GRADIENT_PATTERNS.find((p) => normCss(p.build(c1, c2)) === norm)?.id ??
      null
    );
  }, [current, c1, c2]);

  const activePattern = GRADIENT_PATTERNS.find((p) => p.id === activeId);

  function handleColor(which: "c1" | "c2", hex: string) {
    const rgba = toRgba(hex);
    const nC1 = which === "c1" ? rgba : c1;
    const nC2 = which === "c2" ? rgba : c2;
    // If a template is active it is re-applied with the new colors;
    // if the gradient is custom, angle and stops are preserved.
    onSelect(
      activePattern
        ? activePattern.build(nC1, nC2)
        : replaceEdgeColors(current, nC1, nC2),
    );
  }

  function handleSwap() {
    onSelect(
      activePattern
        ? activePattern.build(c2, c1)
        : replaceEdgeColors(current, c2, c1),
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowPatterns((v) => !v)}
          aria-expanded={showPatterns}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {showPatterns
            ? "Hide templates"
            : `Templates · ${activePattern?.name ?? "8 styles"}`}
        </button>
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {showGuide ? "Hide guide" : "Guide"}
        </button>
      </div>

      {/* Two base colors: the whole grid applies on top of them */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
        <label className="flex items-center gap-1.5 cursor-pointer" title="Color A (start / center)">
          <input
            type="color"
            value={toHexInput(c1)}
            onChange={(e) => handleColor("c1", e.target.value)}
            className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0"
            aria-label="Gradient color A"
          />
          <span className="text-[10px] font-bold text-muted-foreground">A</span>
        </label>
        <button
          type="button"
          onClick={handleSwap}
          title="Swap A ↔ B"
          aria-label="Swap colors A and B"
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3L4 7l4 4" />
            <path d="M4 7h16" />
            <path d="M16 21l4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
        </button>
        <label className="flex items-center gap-1.5 cursor-pointer" title="Color B (end / edge)">
          <input
            type="color"
            value={toHexInput(c2)}
            onChange={(e) => handleColor("c2", e.target.value)}
            className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0"
            aria-label="Gradient color B"
          />
          <span className="text-[10px] font-bold text-muted-foreground">B</span>
        </label>
        <span className="ml-auto text-[9px] leading-tight text-muted-foreground/70 max-w-[110px] text-right">
          {activeId ? `Template: ${activePattern?.name}` : "Custom gradient"}
        </span>
      </div>

      {showGuide && (
        <ul className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1 text-[11px] leading-4 text-muted-foreground">
          <li>
            <b className="text-foreground">One light, always:</b> Diagonal
            135° ↘ (top-left light) is the icon standard. Switching
            template changes the distribution, not your colors.
          </li>
          <li>
            <b className="text-foreground">2 stops = crisp;</b> Trio adds
            a 50% blend for smooth transitions at large sizes.
          </li>
          <li>
            <b className="text-foreground">Geometric cut only:</b> the hard
            50% cut requires simple icons; fine detail gets noisy at
            48dp.
          </li>
          <li>
            <b className="text-foreground">Radial = focus:</b> Halo holds A
            up to 45% to highlight the glyph; Glow blends from the
            center.
          </li>
          <li>
            <b className="text-foreground">3:1 contrast (M3):</b> a white
            icon needs mid-dark A/B; with light A/B use a dark icon.
          </li>
        </ul>
      )}

      <div
        data-state={showPatterns ? "open" : "closed"}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          showPatterns ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0" inert={!showPatterns}>
      <div
        className="grid grid-cols-4 gap-1 pt-1"
        role="group"
        aria-label="Gradient templates"
      >
        {GRADIENT_PATTERNS.map((p) => {
          const css = p.build(c1, c2);
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.name}
              aria-pressed={active}
              title={`${p.name} (${p.hint}) — ${p.description} Export: ${p.android}.`}
              onClick={() => onSelect(css)}
              className={`group flex flex-col items-center gap-1 rounded-lg p-1 transition-all hover:bg-accent/60 ${
                active ? "bg-primary/10 ring-1 ring-primary" : ""
              }`}
            >
              <span
                aria-hidden
                style={{ background: css }}
                className="h-7 w-full rounded-md border border-border shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-transform group-hover:scale-[1.03]"
              />
              <span className="text-[9px] font-semibold leading-none text-muted-foreground group-hover:text-foreground truncate max-w-full">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GradientTemplates);
