import { memo } from "react";
import { useUiIcons } from "@/lib/uiIcons";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onToggleTheme: () => void;
  dark: boolean;
  onCopyLink: () => void;
  onDownload: () => void;
  onReset: () => void;
  copied: boolean;
}

function ToolbarButton({
  onClick,
  icon,
  label,
  title,
  primary,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  title: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`relative group/tooltip flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "shadow-[inset_0_0_0_1px_hsl(var(--border))] text-primary hover:bg-accent/40"
      }`}
    >
      {icon}
      {label && <span className="hidden sm:inline">{label}</span>}
      <span className="ik-tooltip">{title}</span>
    </button>
  );
}

export default memo(function Header({
  onToggleSidebar,
  sidebarOpen,
  onToggleTheme,
  dark,
  onCopyLink,
  onDownload,
  onReset,
  copied,
}: HeaderProps) {
  const I = useUiIcons();
  return (
    <>
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-40 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent text-foreground"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <I.X size={20} /> : <I.Menu size={20} />}
          </button>
          <img
            src="/ic_launcher.svg"
            alt="Android Icon Studio Logo"
            className="size-8 shrink-0 drop-shadow-sm"
          />
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-[15px] font-black text-foreground tracking-tight leading-5">
              Android Icon Studio
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ToolbarButton
            onClick={onDownload}
            icon={<I.Download size={16} />}
            label="Download"
            title="Download (Ctrl+D)"
            primary
          />
          <ToolbarButton
            onClick={onCopyLink}
            icon={
              copied ? (
                <I.Check size={16} className="text-primary" />
              ) : (
                <I.Link2 size={16} />
              )
            }
            title={copied ? "Copied!" : "Copy link (Ctrl+S)"}
          />
          <ToolbarButton
            onClick={onToggleTheme}
            icon={dark ? <I.Sun size={16} /> : <I.Moon size={16} />}
            title={dark ? "Switch to light theme" : "Switch to dark theme (Ctrl+T)"}
          />
          <ToolbarButton
            onClick={onReset}
            icon={<I.RotateCcw size={16} />}
            title="Start over"
          />
        </div>
      </header>
    </>
  );
});
