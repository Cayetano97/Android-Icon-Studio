import { memo } from "react";
import type { IconConfig } from "@/types/icon";
import PreviewBoard from "@/components/PreviewBoard";

interface IconWorkspaceProps {
  config: IconConfig;
  onChange: (updates: Partial<IconConfig>) => void;
  onIconSvg: (svg: string) => void;
  appThemeDark: boolean;
}

export default memo(function IconWorkspace({
  config,
  onChange,
  onIconSvg,
  appThemeDark,
}: IconWorkspaceProps) {
  return (
    <main
      id="workspace"
      aria-label="Icon preview"
      tabIndex={-1}
      className="workspace-canvas relative flex min-w-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
    >
      <PreviewBoard
        config={config}
        onChange={onChange}
        onIconSvg={onIconSvg}
        appThemeDark={appThemeDark}
      />
    </main>
  );
});
