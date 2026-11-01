import type { ComponentProps, Ref } from "react";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ref,
  ...props
}: ComponentProps<"input"> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-panel px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input };
