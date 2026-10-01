import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  gradientToSolid,
  normalizeGradientColors,
  solidToGradient,
} from "@/lib/color";
import { useUiIcons } from "@/lib/uiIcons";
import { DegreePicker } from "./DegreePicker";
import { Segment } from "./fields";

/** Default picker body width (matches the library's default styling). */
const BASE_PANEL_WIDTH = 250;
/** Popover chrome around the picker body. */
const PANEL_PADDING = 20;
const POPOVER_MARGIN = 8;

/**
 * Lazily loaded react-best-gradient-color-picker body. The library ships its
 * own controls, but they are hidden (`hideControls`) so this panel renders an
 * app-styled top bar instead — shared by linear and radial gradients.
 */
const LazyColorPickerPanel = lazy(() =>
  import("react-best-gradient-color-picker").then((m) => {
    const ColorPicker = m.default;
    const useColorPicker = m.useColorPicker;

    function ColorPickerPanel({
      value,
      onChange,
      idSuffix,
      width,
    }: {
      value: string;
      onChange: (c: string) => void;
      idSuffix: string;
      width: number;
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
        isGradient,
      } = useColorPicker(value, onChange);
      const I = useUiIcons();

      return (
        <>
          {/* Top bar for gradients: the type toggle is always visible (also
              in radial mode) so the user can switch back; angle only applies
              to linear gradients. */}
          {isGradient && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-popover border-b border-border">
              <div className="flex bg-background rounded-lg p-0.5 border border-border">
                <button
                  type="button"
                  onClick={setLinear}
                  title="Linear gradient"
                  aria-pressed={gradientType === "linear-gradient"}
                  className={`p-1 rounded-md transition-all ${gradientType === "linear-gradient" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M4 20L20 4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={setRadial}
                  title="Radial gradient"
                  aria-pressed={gradientType === "radial-gradient"}
                  className={`p-1 rounded-md transition-all ${gradientType === "radial-gradient" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                </button>
              </div>
              {gradientType === "linear-gradient" && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <DegreePicker
                    size="small"
                    degrees={degrees}
                    onChange={setDegrees}
                  />
                </>
              )}
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Stop
                </span>
                <input
                  type="number"
                  value={Math.round(currentLeft)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) setPointLeft(next);
                  }}
                  aria-label="Gradient stop position"
                  className="ik-input w-10! px-1! text-center"
                />
                <button
                  type="button"
                  onClick={() => deletePoint(selectedPoint)}
                  title="Delete color stop"
                  aria-label="Delete color stop"
                  className="p-1.5 rounded-lg bg-background border border-border text-muted-foreground hover:text-red-500 transition-all"
                >
                  <I.Trash2 size={12} aria-hidden />
                </button>
              </div>
            </div>
          )}

          <ColorPicker
            value={value}
            onChange={onChange}
            width={width}
            hideColorTypeBtns
            hideControls
            hidePresets={false}
            hideEyeDrop={false}
            hideAdvancedSliders
            hideColorGuide
            hideInputType
            disableLightMode={false}
            idSuffix={idSuffix}
          />
        </>
      );
    }

    return { default: ColorPickerPanel };
  }),
);

interface PopoverColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  solidOnly?: boolean;
  idSuffix: string;
  /** Small letter rendered next to the swatch (e.g. gradient stops A/B). */
  badge?: string;
}

function PopoverColorPicker({
  label,
  value,
  onChange,
  solidOnly,
  idSuffix,
  badge,
}: PopoverColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [panelWidth, setPanelWidth] = useState(BASE_PANEL_WIDTH);
  const swatchRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isGradient = value.toLowerCase().includes("gradient");
  // The picker library only understands rgb-style colors: rewrite any
  // hsl()/hsla() (e.g. from previously saved sessions) before handing
  // the value over, otherwise opening the popover throws.
  const displayValue = normalizeGradientColors(value);

  /**
   * Fixed-position popover, clamped to the viewport on every axis: width
   * shrinks on narrow screens and the body scrolls instead of overflowing on
   * short ones.
   */
  function computePosition() {
    if (!swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const nextPanelWidth = Math.max(
      180,
      Math.min(BASE_PANEL_WIDTH, vw - POPOVER_MARGIN * 2 - PANEL_PADDING),
    );
    const width = nextPanelWidth + PANEL_PADDING;
    const height = popoverRef.current?.offsetHeight || 420;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(
      POPOVER_MARGIN,
      Math.min(left, vw - width - POPOVER_MARGIN),
    );

    let top = rect.bottom + POPOVER_MARGIN;
    if (top + height > vh - POPOVER_MARGIN) {
      top = Math.max(POPOVER_MARGIN, rect.top - height - POPOVER_MARGIN);
    }
    // Very short viewports: pin to the top and let it scroll inside.
    if (top + height > vh - POPOVER_MARGIN) {
      top = POPOVER_MARGIN;
    }

    setPanelWidth(nextPanelWidth);
    setPopoverStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight: vh - POPOVER_MARGIN * 2,
      zIndex: 9999,
    });
  }

  useEffect(() => {
    if (!isOpen) return;
    computePosition();
    // Second pass once the picker is mounted and its real height is known.
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
    if (!isOpen) return;
    // The portal renders at the end of <body>, so without moving focus the
    // next Tab press would skip the whole picker. focus() + preventScroll
    // keeps the keyboard flow inside the popover.
    popoverRef.current?.focus({ preventScroll: true });
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

  function toggle(next: boolean) {
    if (next) computePosition();
    setIsOpen(next);
  }

  function handleModeSwitch(toGradient: boolean) {
    if (toGradient === isGradient) return;
    if (toGradient) {
      onChange(solidToGradient(value));
    } else {
      onChange(gradientToSolid(value));
    }
  }

  return (
    <div
      className={`flex items-center relative group ${badge ? "gap-1" : "gap-2"}`}
    >
      <div
        ref={swatchRef}
        role="button"
        tabIndex={0}
        aria-label={`Open ${label} picker`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => toggle(!isOpen)}
        title={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(!isOpen);
          }
        }}
        style={{ background: displayValue }}
        className="size-6 shrink-0 rounded-full border border-border cursor-pointer shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform hover:scale-110"
      />
      {badge && (
        <span
          className="text-[10px] font-bold text-muted-foreground"
          aria-hidden
        >
          {badge}
        </span>
      )}
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
            role="dialog"
            aria-label={`${label} picker`}
            tabIndex={-1}
            style={popoverStyle}
            className="ik-popup-enter rounded-xl shadow-2xl overflow-y-auto overscroll-contain border border-border bg-popover outline-none scrollbar-thin"
          >
            <Suspense
              fallback={
                <div
                  className="h-[300px] bg-popover flex items-center justify-center"
                  style={{ width: popoverStyle.width }}
                >
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <LazyColorPickerPanel
                value={displayValue}
                onChange={onChange}
                idSuffix={idSuffix}
                width={panelWidth}
              />
            </Suspense>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default PopoverColorPicker;
