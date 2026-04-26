import React, { useRef, useEffect, memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconConfig, IconShape } from '@/types/icon';
import { Circle, Square, RectangleHorizontal, Ban } from 'lucide-react';
import ColorPicker from 'react-best-gradient-color-picker';

interface Props {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
}

const shapes: { value: IconShape; label: string; icon: typeof Circle }[] = [
  { value: 'circle', label: 'Circle', icon: Circle },
  { value: 'squircle', label: 'Squircle', icon: RectangleHorizontal },
  { value: 'square', label: 'Square', icon: Square },
  { value: 'none', label: 'None', icon: Ban },
];

// ---------------------------------------------------------------------------
// Helpers — convert between solid color and gradient CSS string
// ---------------------------------------------------------------------------

/** Extract the first rgba/rgb/hex colour found in a CSS string */
function extractFirstColor(css: string): string {
  const rgbaMatch = css.match(/rgba?\([^)]+\)/);
  if (rgbaMatch) return rgbaMatch[0];
  const hexMatch = css.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  return 'rgba(99,102,241,1)';
}

/** Given a solid colour string, wrap into a pleasant default gradient */
function solidToGradient(color: string): string {
  return `linear-gradient(135deg, ${color} 0%, rgba(0,188,212,1) 100%)`;
}

/** Given a gradient string, pull out the first colour stop */
function gradientToSolid(css: string): string {
  return extractFirstColor(css);
}

// ---------------------------------------------------------------------------
// PopoverColorPicker
// ---------------------------------------------------------------------------
interface PopoverColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  /** When true, hides the Solid / Gradient toggle (icon color is always solid) */
  solidOnly?: boolean;
  /** Unique suffix for picker ids — required when >1 picker is on the page */
  idSuffix: string;
}

const PICKER_WIDTH = 270;

function PopoverColorPicker({ label, value, onChange, solidOnly, idSuffix }: PopoverColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const swatchRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isGradient = value.includes('gradient');

  function computePosition() {
    if (!swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    const margin = 8;
    const sidebarWidth = 384; // w-96 in Tailwind
    const isDesktop = window.innerWidth >= 1024; // lg breakpoint
    
    let left;
    if (isDesktop) {
      // On desktop, place it exactly to the right of the sidebar
      left = sidebarWidth + margin;
    } else {
      // On mobile, try to align with the swatch
      left = rect.left;
      if (left + PICKER_WIDTH > window.innerWidth - margin) {
        left = rect.right - PICKER_WIDTH;
      }
    }
    
    // Safety clamp for horizontal bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - PICKER_WIDTH - margin));
    
    // Vertical position
    let top;
    // Use actual height if available, otherwise estimate
    const height = popoverRef.current?.offsetHeight || 450;
    
    if (isDesktop) {
      // On desktop, center the picker vertically relative to the swatch
      top = rect.top + rect.height / 2 - height / 2;
    } else {
      // On mobile, keep it below the swatch
      top = rect.bottom + margin;
    }
    
    // Safety clamp for vertical bounds
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    
    setPopoverStyle({ position: 'fixed', top, left, width: PICKER_WIDTH, zIndex: 9999 });
  }

  // Keep popover in sync if the user resizes/scrolls while it is open
  useEffect(() => {
    if (!isOpen) return;
    
    // Initial compute
    computePosition();
    
    // Re-compute after a tiny delay to ensure height is captured if it changed during render
    const timer = setTimeout(computePosition, 0);
    
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div
      className="bg-card/30 backdrop-blur-sm border border-border/40 p-3 rounded-2xl flex flex-col items-center gap-1.5 group relative"
    >
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </label>

      {/* Swatch / preview */}
      <div
        ref={swatchRef}
        style={{ background: value }}
        className="w-10 h-10 rounded-xl border border-border/40 shadow-inner cursor-pointer transition-transform hover:scale-105"
        onClick={() => {
          // Compute position BEFORE opening so the first render already has
          // the correct fixed coordinates (React 18 batches both setState calls).
          if (!isOpen) computePosition();
          setIsOpen(prev => !prev);
        }}
      />

      {/* Solid / Gradient toggle — only for background picker */}
      {!solidOnly && (
        <div className="flex items-center bg-background/50 border border-border/40 rounded-full p-0.5 gap-0.5">
          <button
            onClick={() => handleModeSwitch(false)}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
              !isGradient
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => handleModeSwitch(true)}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
              isGradient
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gradient
          </button>
        </div>
      )}

      {/* Popover — fixed positioning so it never overflows the viewport */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="rounded-2xl shadow-2xl overflow-hidden border border-white/10"
        >
          <ColorPicker
            value={value}
            onChange={onChange}
            width={250}
            hideColorTypeBtns={solidOnly ?? !isGradient}
            hidePresets={false}
            hideEyeDrop={false}
            hideAdvancedSliders={true}
            hideColorGuide={true}
            hideInputType={true}
            disableLightMode={true}
            idSuffix={idSuffix}
          />
        </div>,
        document.body
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
          {/* Icon color — solid only */}
          <PopoverColorPicker
            label="Icon Color"
            value={config.foregroundColor}
            onChange={(color) => onChange({ foregroundColor: color })}
            solidOnly
            idSuffix="fg"
          />

          {/* Background — supports both solid and gradient */}
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
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Container Shape</label>
        <div className="grid grid-cols-4 gap-1.5">
          {shapes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ shape: value })}
              className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all border ${
                config.shape === value
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsla(var(--primary),0.4)] scale-105'
                  : 'bg-background/40 text-muted-foreground border-border/50 hover:bg-accent/40'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Section */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-4 rounded-2xl space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Padding Adjustment</label>
            <span className="text-xs font-bold text-primary">{config.padding}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={45}
            value={config.padding}
            onChange={(e) => onChange({ padding: Number(e.target.value) })}
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(IconCustomizer);
