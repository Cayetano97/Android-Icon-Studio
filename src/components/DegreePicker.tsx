import React, { useState, useRef, useEffect } from "react";

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

  const calculateAngle = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Math.atan2 gives angle from positive x-axis clockwise
      // linear-gradient(0deg) is pointing up
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = (angle + 90) % 360;
      if (angle < 0) angle += 360;

      onChange(Math.round(angle));
    },
    [onChange],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        calculateAngle(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, calculateAngle]);

  const isSmall = size === "small";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${isSmall ? "" : "py-4 bg-zinc-900/50"}`}
    >
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`relative rounded-full bg-zinc-800 border border-zinc-700 shadow-inner flex items-center justify-center cursor-pointer group ${
          isSmall ? "w-8 h-8" : "w-20 h-20 border-2"
        }`}
      >
        {/* Decorative notches */}
        {!isSmall &&
          [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-1.5 bg-zinc-600 rounded-full"
              style={{
                transform: `rotate(${deg}deg) translateY(-32px)`,
                opacity: deg % 90 === 0 ? 1 : 0.5,
              }}
            />
          ))}

        {/* Center pivot */}
        <div
          className={`${isSmall ? "w-1 h-1" : "w-2 h-2"} rounded-full bg-zinc-600 z-10 shadow-sm`}
        />

        {/* Indicator */}
        <div
          className={`absolute inset-0 pointer-events-none ${isDragging ? "" : "transition-transform duration-75 ease-out"}`}
          style={{ transform: `rotate(${degrees}deg)` }}
        >
          {/* Line */}
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 bg-primary/40 rounded-full ${
              isSmall
                ? "w-[1.5px] h-[calc(50%-4px)]"
                : "w-[2px] h-[calc(50%-8px)]"
            }`}
          />

          {/* Arrow/Handle */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border border-zinc-900 shadow-[0_0_10px_rgba(var(--primary),0.6)] group-hover:scale-110 transition-transform ${
              isSmall ? "w-2.5 h-2.5" : "w-4 h-4 border-2"
            }`}
          />
        </div>
      </div>

      {!isSmall && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Angle
          </span>
          <div className="text-xs font-mono text-primary font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 shadow-sm min-w-[45px] text-center">
            {degrees}°
          </div>
        </div>
      )}
    </div>
  );
};
