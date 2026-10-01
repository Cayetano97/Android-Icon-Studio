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
          className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
        >
          <span className="text-4xl">⚠</span>
          <h1 className="text-xl font-black tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Reloading usually fixes it — your design is kept in the URL.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
