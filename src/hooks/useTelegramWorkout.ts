/**
 * Telegram Mini App workout session management hook
 *
 * This hook provides:
 * - Global "Finish workout" button via Telegram's BottomButton/MainButton
 * - Session resume via CloudStorage and deep links (startapp=resume:<id>)
 * - Closing confirmation when workout is active
 *
 * @see https://core.telegram.org/bots/webapps
 * @see https://docs.telegram-mini-apps.com/platform/start-parameter
 */

type ActiveWorkout = { id: string };

interface TelegramButton {
  setText: (text: string) => void;
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  enable: () => void;
  disable: () => void;
}

interface TelegramWebApp {
  ready: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  initDataUnsafe?: {
    start_param?: string;
  };
  BottomButton?: TelegramButton;
  MainButton?: TelegramButton;
  CloudStorage?: {
    getItem: (
      key: string,
      callback: (err: unknown, value: string | null) => void
    ) => void;
    setItem: (key: string, value: string, callback: () => void) => void;
    removeItem: (key: string, callback: () => void) => void;
  };
}

const CLOUD_STORAGE_KEY = "aw"; // active workout
const CLOUD_STORAGE_TIMEOUT_MS = 1500;

function getTg(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Telegram?.WebApp ?? null;
}

function getBottomButton(): TelegramButton | null {
  const tg = getTg();
  if (!tg) return null;
  // Telegram renamed MainButton to BottomButton in API 7.10
  return tg.BottomButton ?? tg.MainButton ?? null;
}

function getStartParam(): string | null {
  const tg = getTg();
  if (!tg) return null;

  // Check URL query param first (tgWebAppStartParam)
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get("tgWebAppStartParam");
    if (qp) return qp;
  }

  // Fallback to initDataUnsafe.start_param
  return tg.initDataUnsafe?.start_param ?? null;
}

async function cloudGet(key: string): Promise<string | null> {
  const tg = getTg();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = setTimeout(() => finish(null), CLOUD_STORAGE_TIMEOUT_MS);

    if (!tg?.CloudStorage?.getItem) {
      finish(null);
      return;
    }

    try {
      tg.ready?.();
      tg.CloudStorage.getItem(key, (_err, val) => finish(val ?? null));
    } catch {
      finish(null);
    }
  });
}

async function cloudSet(key: string, value: string | null): Promise<void> {
  const tg = getTg();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };
    const timeoutId = setTimeout(() => finish(), CLOUD_STORAGE_TIMEOUT_MS);

    if (!tg?.CloudStorage) {
      finish();
      return;
    }

    try {
      tg.ready?.();
      if (value === null) {
        if (!tg.CloudStorage.removeItem) {
          finish();
          return;
        }
        tg.CloudStorage.removeItem(key, () => finish());
      } else {
        if (!tg.CloudStorage.setItem) {
          finish();
          return;
        }
        tg.CloudStorage.setItem(key, value, () => finish());
      }
    } catch {
      finish();
    }
  });
}

export function useTelegramWorkout() {
  /**
   * Set up the Telegram "Finish workout" button.
   * Call this once on app initialization.
   */
  async function attachFinishButton(
    onFinish: (id: string) => Promise<void>
  ): Promise<() => void> {
    const btn = getBottomButton();
    if (!btn) return () => {};

    const handler = async () => {
      btn.showProgress?.(true);
      btn.disable?.();
      try {
        const raw = await cloudGet(CLOUD_STORAGE_KEY);
        const stored: ActiveWorkout | null = raw ? JSON.parse(raw) : null;
        if (stored?.id) {
          await onFinish(stored.id);
        }
        await cloudSet(CLOUD_STORAGE_KEY, null);
        btn.hide?.();
        getTg()?.disableClosingConfirmation?.();
      } finally {
        btn.hideProgress?.();
        btn.enable?.();
      }
    };

    // Clear any existing listeners
    btn.offClick?.(handler);
    btn.onClick?.(handler);

    // Return cleanup function
    return () => {
      btn.offClick?.(handler);
    };
  }

  /**
   * Check for active workout on app start and navigate if found.
   * Handles both deep links (t.me/bot/app?startapp=resume:<id>) and CloudStorage cache.
   */
  async function resumeIfNeeded(
    navigateToActive: (id: string) => void
  ): Promise<boolean> {
    const tg = getTg();
    tg?.ready?.();

    // 1. Check deep link payload: startapp=resume:<id>
    const startParam = getStartParam();
    if (startParam?.startsWith("resume:")) {
      const id = startParam.split("resume:")[1];
      if (id) {
        await cloudSet(CLOUD_STORAGE_KEY, JSON.stringify({ id }));
        navigateToActive(id);
        showFinishButton();
        tg?.enableClosingConfirmation?.();
        return true;
      }
    }

    // 2. Check CloudStorage for cached active workout
    const raw = await cloudGet(CLOUD_STORAGE_KEY);
    const cached: ActiveWorkout | null = raw ? JSON.parse(raw) : null;

    if (cached?.id) {
      // Validate with server
      try {
        const response = await fetch("/api/workouts/active", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          // Check if the cached workout matches server and is still active
          if (data?.id === cached.id && data?.is_completed === false) {
            navigateToActive(cached.id);
            showFinishButton();
            tg?.enableClosingConfirmation?.();
            return true;
          }
        }
      } catch (error) {
        console.error("Failed to validate active workout:", error);
      }

      // Server says no active workout or mismatch, clear cache
      await cloudSet(CLOUD_STORAGE_KEY, null);
    }

    // 3. Fallback: Check localStorage (for non-Telegram or when CloudStorage is empty)
    if (typeof window !== "undefined") {
      const localId = window.localStorage.getItem("activeWorkoutId");
      if (localId) {
        // Validate with server
        try {
          const response = await fetch("/api/workouts/active", {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            // Check if the localStorage workout matches server and is still active
            if (data?.id === localId && data?.is_completed === false) {
              // Sync to CloudStorage
              await cloudSet(
                CLOUD_STORAGE_KEY,
                JSON.stringify({ id: localId })
              );
              navigateToActive(localId);
              showFinishButton();
              tg?.enableClosingConfirmation?.();
              return true;
            }
          }
        } catch (error) {
          console.error(
            "Failed to validate active workout from localStorage:",
            error
          );
        }

        // Server says no active workout or mismatch, clear localStorage
        window.localStorage.removeItem("activeWorkoutId");
        window.dispatchEvent(new Event("active-workout-change"));
      }
    }

    return false;
  }

  /**
   * Mark workout as started. Call when user begins a new workout.
   */
  async function markStarted(id: string): Promise<void> {
    await cloudSet(CLOUD_STORAGE_KEY, JSON.stringify({ id }));
    showFinishButton();
    getTg()?.enableClosingConfirmation?.();
  }

  /**
   * Mark workout as finished. Call after successful POST /finish.
   */
  async function markFinished(): Promise<void> {
    await cloudSet(CLOUD_STORAGE_KEY, null);
    getBottomButton()?.hide?.();
    getTg()?.disableClosingConfirmation?.();
  }

  /**
   * Get the current active workout ID from CloudStorage (sync check for UI).
   */
  async function getActiveWorkoutId(): Promise<string | null> {
    const raw = await cloudGet(CLOUD_STORAGE_KEY);
    if (!raw) return null;
    try {
      const data: ActiveWorkout = JSON.parse(raw);
      return data.id ?? null;
    } catch {
      return null;
    }
  }

  return {
    attachFinishButton,
    resumeIfNeeded,
    markStarted,
    markFinished,
    getActiveWorkoutId,
  };
}

// Helper to show the button with standard text
function showFinishButton(): void {
  const btn = getBottomButton();
  if (!btn) return;
  btn.setText?.("Завершить тренировку");
  // btn.show?.(); // DISABLED - using in-app button instead
}
