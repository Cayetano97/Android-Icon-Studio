import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/hooks/use-theme";
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
      dark,
    }: {
      value: string;
      onChange: (c: string) => void;
      idSuffix: string;
      width: number;
      dark: boolean;
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
                  aria-label="Linear gradient"
                  aria-pressed={gradientType === "linear-gradient"}
                  className={`p-1.5 rounded-md transition-colors ${gradientType === "linear-gradient" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
                  aria-label="Radial gradient"
                  aria-pressed={gradientType === "radial-gradient"}
                  className={`p-1.5 rounded-md transition-colors ${gradientType === "radial-gradient" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
                <span className="text-[11px] font-semibold text-muted-foreground">
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
                  className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-destructive-text"
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
            disableDarkMode={!dark}
            disableLightMode={dark}
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
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { dark } = useTheme();

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
    // The picker body is lazy: its height changes after the chunk resolves.
    // Reposition on that resize so the panel never runs off the viewport.
    const observer = new ResizeObserver(() => computePosition());
    if (popoverRef.current) observer.observe(popoverRef.current);
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, true);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
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
        // Clicking empty chrome (not another control) should not drop focus
        // on <body>; return it to the swatch so keyboard users keep context.
        if (document.activeElement === document.body) {
          swatchRef.current.focus({ preventScroll: true });
        }
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        // Capture phase: keep the settings drawer (which also listens for
        // Escape) open when the user is only dismissing this popover.
        event.stopPropagation();
        setIsOpen(false);
        swatchRef.current?.focus();
      }
    }
    if (isOpen) document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !popoverRef.current) return;
      const focusable = Array.from(
        popoverRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // The picker library ships visible HEX/R/G/B/A labels but does not
    // associate them with its inputs, and its draggable hue handle has no
    // accessible name. Patch those once the lazily mounted panel appears.
    const panel = popoverRef.current;
    if (!panel) return;

    const patch = () => {
      const labels: Array<[string, string]> = [
        ["rbgcp-hex-input", "Hex color"],
        ["rbgcp-R-input", "Red"],
        ["rbgcp-G-input", "Green"],
        ["rbgcp-B-input", "Blue"],
        ["rbgcp-A-input", "Alpha"],
      ];
      for (const [idPrefix, label] of labels) {
        panel
          .querySelectorAll<HTMLInputElement>(`input[id^="${idPrefix}"]`)
          .forEach((input) => {
            if (!input.getAttribute("aria-label")) {
              input.setAttribute("aria-label", label);
            }
          });
      }
      panel
        .querySelectorAll<HTMLElement>('[role="button"]')
        .forEach((element) => {
          if (element.getAttribute("aria-label")) return;
          element.setAttribute(
            "aria-label",
            element.id.includes("hue-handle") ? "Hue" : "Color stop",
          );
        });
    };

    patch();
    const observer = new MutationObserver(patch);
    observer.observe(panel, { childList: true, subtree: true });
    return () => observer.disconnect();
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
      className={`relative flex items-center ${badge ? "gap-1" : "gap-2"}`}
    >
      <button
        ref={swatchRef}
        type="button"
        aria-label={`Open ${label} picker`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => toggle(!isOpen)}
        title={label}
        style={{ background: displayValue }}
        className="size-8 shrink-0 cursor-pointer rounded-full border border-input/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      />
      {badge && (
        <span
          className="text-[11px] font-semibold text-muted-foreground"
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
          label={`${label} type`}
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
                dark={dark}
              />
            </Suspense>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default PopoverColorPicker;
