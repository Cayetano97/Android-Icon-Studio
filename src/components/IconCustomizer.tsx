import { useRef, useCallback, useEffect, memo, useState } from 'react';
import { IconConfig, IconShape, GradientStop, GradientDirection } from '@/types/icon';
import { Circle, Square, RectangleHorizontal, Ban, Plus, Trash2, Layers } from 'lucide-react';

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

const GRADIENT_DIRECTIONS: { value: GradientDirection; label: string; emoji: string }[] = [
  { value: 'to bottom',       label: '↓',  emoji: '↓' },
  { value: 'to top',          label: '↑',  emoji: '↑' },
  { value: 'to right',        label: '→',  emoji: '→' },
  { value: 'to bottom right', label: '↘', emoji: '↘' },
  { value: 'to bottom left',  label: '↙', emoji: '↙' },
  { value: 'to top right',    label: '↗', emoji: '↗' },
];

/** Builds a CSS linear-gradient string from stops+direction for preview bars */
function buildCssGradient(stops: GradientStop[], direction: GradientDirection): string {
  const stopStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');
  return `linear-gradient(${direction}, ${stopStr})`;
}

// ---------------------------------------------------------------------------
// ColorSwatch – solid colour picker (same logic as before)
// ---------------------------------------------------------------------------
interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
}

const ColorSwatch = memo(function ColorSwatch({ label, value, onChange, compact }: ColorSwatchProps) {
  const localColor = useRef(value);
  const rafId = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const swatchRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

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
    if (swatchRef.current) swatchRef.current.style.backgroundColor = color;
    if (hexRef.current) hexRef.current.textContent = color.toUpperCase();
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      onChange(localColor.current);
    });
  }, [onChange]);

  useEffect(() => {
    return () => { if (rafId.current !== null) cancelAnimationFrame(rafId.current); };
  }, []);

  if (compact) {
    // Inline compact version used inside gradient stop rows
    return (
      <div className="flex items-center gap-2">
        <div
          ref={swatchRef}
          style={{ backgroundColor: value }}
          className="w-8 h-8 rounded-lg border border-border/40 shadow-inner cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
          onClick={() => inputRef.current?.click()}
        />
        <input ref={inputRef} type="color" defaultValue={value} onChange={handleInput} className="sr-only" aria-label={label} />
        <span ref={hexRef} className="text-xs font-mono text-muted-foreground/70">{value.toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/40 p-3 rounded-2xl flex flex-col items-center gap-2 group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</label>
      <div className="relative w-full flex flex-col items-center gap-2">
        <div
          ref={swatchRef}
          style={{ backgroundColor: value }}
          className="w-10 h-10 rounded-xl border border-border/40 shadow-inner cursor-pointer transition-transform hover:scale-105"
          onClick={() => inputRef.current?.click()}
        />
        <input ref={inputRef} type="color" defaultValue={value} onChange={handleInput} className="sr-only" aria-label={label} />
      </div>
      <span ref={hexRef} className="text-xs font-mono text-muted-foreground/70">{value.toUpperCase()}</span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// GradientEditor
// ---------------------------------------------------------------------------
interface GradientEditorProps {
  stops: GradientStop[];
  direction: GradientDirection;
  onStopsChange: (stops: GradientStop[]) => void;
  onDirectionChange: (dir: GradientDirection) => void;
}

const GradientEditor = memo(function GradientEditor({
  stops,
  direction,
  onStopsChange,
  onDirectionChange,
}: GradientEditorProps) {

  const updateStop = useCallback((index: number, patch: Partial<GradientStop>) => {
    const next = stops.map((s, i) => i === index ? { ...s, ...patch } : s);
    onStopsChange(next);
  }, [stops, onStopsChange]);

  const addStop = useCallback(() => {
    // Insert a new stop at the midpoint of the first gap >= 10
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    let pos = 50;
    for (let i = 0; i < sorted.length - 1; i++) {
      const mid = (sorted[i].position + sorted[i + 1].position) / 2;
      if (sorted[i + 1].position - sorted[i].position > 10) { pos = Math.round(mid); break; }
    }
    // Interpolate colour between neighbours (findLast not in ES2020)
    const before = [...sorted].reverse().find(s => s.position <= pos) ?? sorted[0];
    const newStop: GradientStop = { color: before.color, position: pos };
    onStopsChange([...stops, newStop]);
  }, [stops, onStopsChange]);

  const removeStop = useCallback((index: number) => {
    if (stops.length <= 2) return;
    onStopsChange(stops.filter((_, i) => i !== index));
  }, [stops, onStopsChange]);

  const cssGradient = buildCssGradient(stops, direction);

  return (
    <div className="space-y-4">
      {/* Live gradient preview bar */}
      <div
        className="w-full h-8 rounded-xl border border-border/40 shadow-inner"
        style={{ background: cssGradient }}
      />

      {/* Direction selector */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Direction</span>
        <div className="grid grid-cols-6 gap-1">
          {GRADIENT_DIRECTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => onDirectionChange(d.value)}
              title={d.value}
              className={`py-1.5 rounded-lg text-sm font-bold transition-all border ${
                direction === d.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_-4px_hsla(var(--primary),0.5)]'
                  : 'bg-background/40 text-muted-foreground border-border/50 hover:bg-accent/40'
              }`}
            >
              {d.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Stop list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Color Stops ({stops.length})
          </span>
          <button
            onClick={addStop}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={12} /> Add Stop
          </button>
        </div>

        {stops.map((stop, i) => (
          <div key={i} className="bg-background/40 border border-border/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <ColorSwatch
                label={`Stop ${i + 1}`}
                value={stop.color}
                onChange={(c) => updateStop(i, { color: c })}
                compact
              />
              <button
                onClick={() => removeStop(i)}
                disabled={stops.length <= 2}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove stop"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {/* Position slider */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
                className="flex-1 accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{stop.position}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function IconCustomizer({ config, onChange }: Props) {
  const [gradientOpen, setGradientOpen] = useState(config.gradient.enabled);

  const toggleGradient = () => {
    const enabled = !config.gradient.enabled;
    setGradientOpen(enabled);
    onChange({ gradient: { ...config.gradient, enabled } });
  };

  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <div className="space-y-3">
        {/* Icon colour is always solid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Background: solid swatch only when gradient disabled */}
          {!config.gradient.enabled && (
            <ColorSwatch
              label="Background Color"
              value={config.backgroundColor}
              onChange={(color) => onChange({ backgroundColor: color })}
            />
          )}
          <ColorSwatch
            label="Icon Color"
            value={config.foregroundColor}
            onChange={(color) => onChange({ foregroundColor: color })}
          />
        </div>

        {/* Gradient toggle + editor */}
        <div className="bg-card/30 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden">
          <button
            onClick={toggleGradient}
            className="w-full flex items-center justify-between p-3 group"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Background Gradient
              </span>
            </div>
            {/* Toggle pill */}
            <div
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                config.gradient.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  config.gradient.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Expanded gradient editor */}
          {config.gradient.enabled && (
            <div className="px-3 pb-3 border-t border-border/30 pt-3">
              <GradientEditor
                stops={config.gradient.stops}
                direction={config.gradient.direction}
                onStopsChange={(stops) => onChange({ gradient: { ...config.gradient, stops } })}
                onDirectionChange={(dir) => onChange({ gradient: { ...config.gradient, direction: dir } })}
              />
            </div>
          )}
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
