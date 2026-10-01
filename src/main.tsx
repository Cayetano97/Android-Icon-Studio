import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Stale-chunk recovery: after a deploy, lazily imported chunks may 404 and
// reject with `vite:preloadError`. Reload once or twice to pick up the new
// HTML; if reloads stop helping, the error surfaces in the ErrorBoundary.
window.addEventListener("vite:preloadError", () => {
  const KEY = "android-icon-studio:preload-reloads";
  try {
    const attempts = Number(sessionStorage.getItem(KEY) ?? "0");
    if (attempts < 2) {
      sessionStorage.setItem(KEY, String(attempts + 1));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
