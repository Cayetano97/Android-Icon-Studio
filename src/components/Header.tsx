import { memo, type ReactNode } from "react";
import { useUiIcons } from "@/lib/uiIcons";
import { GITHUB_URL } from "@/lib/links";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onToggleTheme: () => void;
  dark: boolean;
  onCopyLink: () => void;
  onDownload: () => void;
  onReset: () => void;
  copied: boolean;
  downloading?: boolean;
}

function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
  ariaLabel,
  tooltip,
  primary,
  disabled,
  href,
  keyshortcuts,
}: {
  onClick?: () => void;
  icon: ReactNode;
  label?: string;
  ariaLabel: string;
  tooltip?: string;
  primary?: boolean;
  disabled?: boolean;
  href?: string;
  keyshortcuts?: string;
}) {
  const base = `group/tooltip relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 ${
    primary
      ? "bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary-hover sm:px-3.5"
      : "px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

  const content = (
    <>
      {icon}
      {label && <span className="hidden sm:inline">{label}</span>}
      {tooltip && (
        <span className="ik-tooltip" aria-hidden="true">
          {tooltip}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={ariaLabel}
        className={base}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-keyshortcuts={keyshortcuts}
      className={base}
    >
      {content}
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
  downloading,
}: HeaderProps) {
  const I = useUiIcons();
  const MenuIcon = sidebarOpen ? I.X : I.Menu;

  return (
    <>
      <a
        href="#workspace"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]"
      >
        Skip to preview
      </a>
      <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-3 backdrop-blur-xl sm:gap-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label={sidebarOpen ? "Close settings" : "Open settings"}
            aria-expanded={sidebarOpen}
            aria-controls="settings-panel"
          >
            <MenuIcon size={19} aria-hidden />
          </button>
          <img
            src="/android-chrome-192x192.png"
            alt=""
            width={30}
            height={30}
            fetchPriority="high"
            className="size-[30px] shrink-0 rounded-[9px] shadow-sm"
          />
          <div className="min-w-0">
            <h1 className="font-display truncate text-[14px] font-bold leading-5 tracking-[-0.015em] text-foreground sm:text-[15px]">
              <span className="sr-only">Android Icon Studio</span>
              <span aria-hidden="true" className="hidden min-[410px]:inline">
                Android Icon Studio
              </span>
              <span aria-hidden="true" className="min-[410px]:hidden">
                Icon Studio
              </span>
            </h1>
            <p className="hidden text-[11px] font-medium leading-3 text-muted-foreground md:block">
              Adaptive icons for Android
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ToolbarButton
            onClick={onDownload}
            icon={
              downloading ? (
                <span
                  aria-hidden
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <I.Download size={16} aria-hidden />
              )
            }
            label={downloading ? "Preparing…" : "Download"}
            ariaLabel={
              downloading ? "Preparing download…" : "Download icon bundle"
            }
            primary
            disabled={downloading}
            keyshortcuts="Control+S Meta+S"
          />
          <ToolbarButton
            onClick={onCopyLink}
            icon={
              copied ? (
                <I.Check size={16} aria-hidden />
              ) : (
                <I.Link2 size={16} aria-hidden />
              )
            }
            ariaLabel={copied ? "Link copied" : "Copy share link"}
            tooltip={copied ? "Copied" : "Copy link"}
          />
          <ToolbarButton
            onClick={onToggleTheme}
            icon={
              dark ? (
                <I.Sun size={16} aria-hidden />
              ) : (
                <I.Moon size={16} aria-hidden />
              )
            }
            ariaLabel={
              dark ? "Switch to light theme" : "Switch to dark theme"
            }
            tooltip={dark ? "Light theme" : "Dark theme"}
          />
          <ToolbarButton
            onClick={onReset}
            icon={<I.RotateCcw size={15} aria-hidden />}
            ariaLabel="Reset icon design"
            tooltip="Reset design"
          />
          <div className="hidden md:block">
            <ToolbarButton
              href={GITHUB_URL}
              icon={<GithubMark size={16} />}
              ariaLabel="View source on GitHub (opens in a new tab)"
              tooltip="Source"
            />
          </div>
        </div>

        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Link copied to clipboard" : ""}
        </span>
      </header>
    </>
  );
});
