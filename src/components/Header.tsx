import { memo } from "react";
import { Download, Sun, Moon, Menu, X, Share2, Check } from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onToggleTheme: () => void;
  dark: boolean;
  onShare: () => void;
  onDownload: () => void;
  copied: boolean;
}

export default memo(function Header({
  onToggleSidebar,
  sidebarOpen,
  onToggleTheme,
  dark,
  onShare,
  onDownload,
  copied,
}: HeaderProps) {
  return (
    <>
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent text-foreground"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center justify-center">
            <img
              src="/ic_launcher.svg"
              alt="Android Icon Studio Logo"
              className="size-8 drop-shadow-sm"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Android Icon Studio
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share icon link"
            title="Copy shareable link"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            <span className="hidden sm:inline">
              {copied ? "Copied!" : "Share"}
            </span>
          </button>
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download icons"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download Icons</span>
          </button>
        </div>
      </header>
    </>
  );
});
