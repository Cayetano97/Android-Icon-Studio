import { useEffect, useReducer } from "react";
import type { DarkTheme, IconConfig } from "@/types/icon";
import { renderIcon } from "@/lib/iconRenderer";

export interface PreviewImages {
  /** Launcher icon (rendered at 2x for crispness). */
  phone: string;
  /** Large specimen icon used by the icon card. */
  large: string;
}

export function resolveDarkTheme(darkTheme: DarkTheme, appThemeDark: boolean) {
  if (darkTheme === "dark") return true;
  if (darkTheme === "light") return false;
  return appThemeDark;
}

interface PreviewState {
  images: PreviewImages | null;
  error: boolean;
  /** A new config is being rendered while the previous images stay visible. */
  pending: boolean;
}

type Action =
  | { type: "start" }
  | { type: "success"; images: PreviewImages }
  | { type: "error" };

function reducer(state: PreviewState, action: Action): PreviewState {
  switch (action.type) {
    case "start":
      return { ...state, pending: true };
    case "success":
      return { images: action.images, error: false, pending: false };
    case "error":
      return { images: null, error: true, pending: false };
  }
}

/**
 * Renders every preview surface in one debounced pass. Keeping the previous
 * images on screen while the next pass runs avoids the full-board flash that a
 * pending-state reset would cause on every slider tick.
 */
export function usePreviewImages(config: IconConfig): PreviewState {
  const [state, dispatch] = useReducer(reducer, {
    images: null,
    error: false,
    pending: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function renderAll() {
      dispatch({ type: "start" });
      try {
        const [phone, large] = await Promise.all([
          renderIcon(config, {
            assetSize: { w: 192, h: 192 },
            shape: config.shape,
          }),
          renderIcon(config, {
            assetSize: { w: 384, h: 384 },
            shape: config.shape,
          }),
        ]);

        if (cancelled) return;
        dispatch({
          type: "success",
          images: {
            phone: phone.toDataURL(),
            large: large.toDataURL(),
          },
        });
      } catch (error) {
        console.error("Failed to render preview:", error);
        if (!cancelled) dispatch({ type: "error" });
      }
    }

    // Trailing debounce: rapid slider drags coalesce into one render pass.
    const timer = window.setTimeout(renderAll, 70);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config]);

  return state;
}
