import { useEffect } from "react";

/**
 * Hook to handle Telegram viewport height correctly (iOS/Telegram quirks)
 * Sets --vh CSS variable for proper min-height calculations
 */
export function useTelegramViewport() {
  useEffect(() => {
    const set = () => {
      const h = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${h}px`);
    };

    set();
    window.addEventListener("resize", set);

    // Telegram WebApp viewport event
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            onEvent?: (event: string, callback: () => void) => void;
            offEvent?: (event: string, callback: () => void) => void;
          };
        };
      }
    ).Telegram?.WebApp;

    tg?.onEvent?.("viewportChanged", set);

    return () => {
      window.removeEventListener("resize", set);
      tg?.offEvent?.("viewportChanged", set);
    };
  }, []);
}
