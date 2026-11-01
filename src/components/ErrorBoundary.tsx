import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time crashes anywhere below it and offers a reload instead of
 * a blank page. The design lives in the URL, so a reload is non-destructive.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught error:", error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive-text">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <h1 className="font-display text-xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Reloading usually fixes it — your design is kept in the URL.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
