import React, { useState, useRef } from "react";

interface DegreePickerProps {
  degrees: number;
  onChange: (degrees: number) => void;
  size?: "small" | "normal";
}

export const DegreePicker: React.FC<DegreePickerProps> = ({
  degrees,
  onChange,
  size = "normal",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 90) % 360;
    if (angle < 0) angle += 360;

    onChange(Math.round(angle));
  };

  // Pointer Events with capture: move/up keep targeting this element even
  // when the pointer leaves it, so no window listeners are needed and touch
  // drags work the same as mouse drags.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    calculateAngle(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange((degrees - 5 + 360) % 360);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange((degrees + 5) % 360);
    }
  };

  const isSmall = size === "small";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${isSmall ? "" : "py-4 bg-popover/50"}`}
    >
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Gradient angle selector"
        aria-valuenow={degrees}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuetext={`${degrees} degrees`}
        className={`touch-none relative rounded-full bg-background border border-border shadow-inner flex items-center justify-center cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isSmall ? "size-8" : "size-20 border-2"
        }`}
      >
        {!isSmall &&
          [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-1.5 bg-border rounded-full"
              style={{
                transform: `rotate(${deg}deg) translateY(-32px)`,
                opacity: deg % 90 === 0 ? 1 : 0.5,
              }}
            />
          ))}

        <div
          className={`${isSmall ? "size-1" : "size-2"} rounded-full bg-border z-10 shadow-sm`}
        />

        <div
          className={`absolute inset-0 pointer-events-none ${isDragging ? "" : "transition-transform duration-75 ease-out"}`}
          style={{ transform: `rotate(${degrees}deg)` }}
        >
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 bg-primary/40 rounded-full ${
              isSmall
                ? "w-[1.5px] h-[calc(50%-4px)]"
                : "w-[2px] h-[calc(50%-8px)]"
            }`}
          />
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border border-popover shadow-[0_0_10px_hsl(var(--primary)/0.6)] group-hover:scale-110 transition-transform ${
              isSmall ? "size-2.5" : "size-4 border-2"
            }`}
          />
        </div>
      </div>

      {!isSmall && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Angle
          </span>
          <div className="text-xs font-mono text-primary font-bold bg-popover px-2 py-0.5 rounded border border-border shadow-sm min-w-[45px] text-center">
            {degrees}°
          </div>
        </div>
      )}
    </div>
  );
};
