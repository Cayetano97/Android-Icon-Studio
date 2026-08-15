import { memo } from "react";
import { IconConfig } from "@/types/icon";
import IconPreview from "@/components/IconPreview";

interface IconWorkspaceProps {
  config: IconConfig;
  onIconSvg: (svg: string) => void;
  appThemeDark: boolean;
}

export default memo(function IconWorkspace({
  config,
  onIconSvg,
  appThemeDark,
}: IconWorkspaceProps) {
  return (
    <main
      id="workspace"
      className="flex-1 min-w-0 overflow-hidden relative bg-[hsl(var(--background))]"
    >
      <IconPreview
        config={config}
        onIconSvg={onIconSvg}
        appThemeDark={appThemeDark}
      />
    </main>
  );
});
