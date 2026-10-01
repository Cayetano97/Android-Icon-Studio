import { memo, useMemo, useState } from "react";
import {
  GRADIENT_PATTERNS,
  extractTwoColors,
  findActivePattern,
} from "@/lib/gradientPatterns";
import { useUiIcons } from "@/lib/uiIcons";

interface Props {
  current: string;
  onSelect: (css: string) => void;
}

/**
 * Distribution templates applied on top of the current base colors A/B.
 * They are shortcuts, not a separate mode: the inline editor (type / angle /
 * colors) can customize them further and the active one stays highlighted.
 */
function GradientTemplates({ current, onSelect }: Props) {
  const I = useUiIcons();
  const [showGuide, setShowGuide] = useState(false);
  // Collapsible template grid by default: keeps the sidebar from growing
  // when switching to gradient and losing the no-scroll fit (M3 disclosure).
  const [showPatterns, setShowPatterns] = useState(false);

  // The two base colors come from the current background (first/last stop).
  const { c1, c2 } = useMemo(() => extractTwoColors(current), [current]);
  const activePattern = useMemo(() => findActivePattern(current), [current]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowPatterns((v) => !v)}
          aria-expanded={showPatterns}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {showPatterns
            ? "Hide templates"
            : `Templates · ${activePattern?.name ?? "8 styles"}`}
          {showPatterns ? (
            <I.ChevronDown size={12} aria-hidden />
          ) : (
            <I.ChevronRight size={12} aria-hidden />
          )}
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
          <div className="ik-gradient-grid-wrap pt-1">
            <div
              className="ik-gradient-grid"
              role="group"
              aria-label="Gradient templates"
            >
              {GRADIENT_PATTERNS.map((p) => {
                const css = p.build(c1, c2);
                const active = p.id === activePattern?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.name}
                    aria-pressed={active}
                    title={`${p.name} (${p.hint}) — ${p.description} Export: ${p.android}.`}
                    onClick={() => onSelect(css)}
                    className={`group flex min-w-0 flex-col items-center gap-1 rounded-lg p-1 transition-all hover:bg-accent/60 ${
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
    </div>
  );
}

export default memo(GradientTemplates);
