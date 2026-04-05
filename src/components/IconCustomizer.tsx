import { useRef, useCallback, useEffect, memo } from 'react';
import { IconConfig, IconShape } from '@/types/icon';
import { Circle, Square, RectangleHorizontal, Ban } from 'lucide-react';

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

/**
 * ColorSwatch – renders a native color input with a local ref so the picker
 * moves at 60 fps while only flushing to the parent state on each RAF tick.
 */
interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorSwatch = memo(function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  // Local mutable ref so we never re-render this component on every tick
  const localColor = useRef(value);
  const rafId = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const swatchRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  // Sync local ref when parent resets (e.g. load preset)
  useEffect(() => {
    if (localColor.current !== value) {
      localColor.current = value;
      if (inputRef.current) inputRef.current.value = value;
      if (swatchRef.current) swatchRef.current.style.backgroundColor = value;
      if (hexRef.current) hexRef.current.textContent = value.toUpperCase();
    }
  }, [value]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    localColor.current = color;

    // Update visuals immediately with DOM manipulation (no React re-render)
    if (swatchRef.current) swatchRef.current.style.backgroundColor = color;
    if (hexRef.current) hexRef.current.textContent = color.toUpperCase();

    // Batch parent state updates into one RAF frame
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      onChange(localColor.current);
    });
  }, [onChange]);

  // Cancel pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-3 rounded-2xl flex flex-col items-center gap-2 group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</label>
      <div className="relative w-full flex flex-col items-center gap-2">
        {/* Visual swatch — updated via direct DOM */}
        <div
          ref={swatchRef}
          style={{ backgroundColor: value }}
          className="w-10 h-10 rounded-xl border border-border/40 shadow-inner cursor-pointer transition-transform hover:scale-105"
          onClick={() => inputRef.current?.click()}
        />
        {/* Hidden native color input */}
        <input
          ref={inputRef}
          type="color"
          defaultValue={value}
          onChange={handleInput}
          className="sr-only"
          aria-label={label}
        />
      </div>
      <span
        ref={hexRef}
        className="text-xs font-mono text-muted-foreground/70"
      >
        {value.toUpperCase()}
      </span>
    </div>
  );
});

function IconCustomizer({ config, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <div className="grid grid-cols-2 gap-3">
        <ColorSwatch
          label="Background Color"
          value={config.backgroundColor}
          onChange={(color) => onChange({ backgroundColor: color })}
        />
        <ColorSwatch
          label="Icon Color"
          value={config.foregroundColor}
          onChange={(color) => onChange({ foregroundColor: color })}
        />
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
