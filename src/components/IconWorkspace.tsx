import { memo } from "react";
import { IconConfig } from "@/types/icon";
import IconPreview from "@/components/IconPreview";

interface IconWorkspaceProps {
  config: IconConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onIconSvg: (svg: string) => void;
}

export default memo(function IconWorkspace({
  config,
  canvasRef,
  onIconSvg,
}: IconWorkspaceProps) {
  return (
    <main id="workspace" className="flex-1 bg-muted/30 overflow-hidden relative">
      <IconPreview config={config} canvasRef={canvasRef} onIconSvg={onIconSvg} />
      {config.monochromeEnabled && (
        <div className="absolute top-4 right-4">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-card/60 backdrop-blur-sm px-3 py-1 rounded-full border border-border/40">
            Android 13+ themed
          </span>
        </div>
      )}
    </main>
  );
});
