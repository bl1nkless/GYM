"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTelegramWorkout } from "@/hooks/useTelegramWorkout";

interface TelegramWorkoutContextType {
  /** Mark workout as started (saves to CloudStorage, shows button) */
  markStarted: (id: string) => Promise<void>;
  /** Mark workout as finished (clears CloudStorage, hides button) */
  markFinished: () => Promise<void>;
  /** Get current active workout ID from CloudStorage */
  getActiveWorkoutId: () => Promise<string | null>;
}

const TelegramWorkoutContext = createContext<TelegramWorkoutContextType | null>(
  null
);

interface TelegramWorkoutProviderProps {
  children: ReactNode;
  /** Path to redirect when finishing workout (default: /app/workouts) */
  summaryPath?: string;
}

/**
 * Provider that initializes Telegram Mini App workout session management.
 *
 * Features:
 * - Auto-resumes active workout on app start
 * - Shows "Finish workout" button globally
 * - Handles deep links (startapp=resume:<id>)
 */
export function TelegramWorkoutProvider({
  children,
  summaryPath = "/app/workouts",
}: TelegramWorkoutProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    attachFinishButton,
    resumeIfNeeded,
    markStarted,
    markFinished,
    getActiveWorkoutId,
  } = useTelegramWorkout();

  const initialized = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handler for finishing workout via Telegram button
  const handleFinishWorkout = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/workouts/${id}/finish`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to finish workout:", await response.text());
        }

        await markFinished();

        // Navigate to summary/history page
        router.push(summaryPath);
      } catch (error) {
        console.error("Error finishing workout:", error);
      }
    },
    [markFinished, router, summaryPath]
  );

  // Initialize on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      // 1. Attach the global finish button
      cleanupRef.current = await attachFinishButton(handleFinishWorkout);

      // 2. Check if we need to resume a workout
      const isActiveWorkoutPath = pathname?.startsWith("/app/workouts/active");

      // Only auto-navigate if not already on active workout page
      if (!isActiveWorkoutPath) {
        await resumeIfNeeded((id) => {
          router.push(`/app/workouts/active?resumeId=${id}`);
        });
      }
    };

    init();

    return () => {
      cleanupRef.current?.();
    };
  }, [
    attachFinishButton,
    handleFinishWorkout,
    pathname,
    resumeIfNeeded,
    router,
  ]);

  const contextValue: TelegramWorkoutContextType = {
    markStarted,
    markFinished,
    getActiveWorkoutId,
  };

  return (
    <TelegramWorkoutContext.Provider value={contextValue}>
      {children}
    </TelegramWorkoutContext.Provider>
  );
}

/**
 * Hook to access Telegram workout session controls.
 *
 * @example
 * ```tsx
 * const { markStarted } = useTelegramWorkoutContext();
 *
 * // When starting a new workout:
 * const workoutId = await createWorkout();
 * await markStarted(workoutId);
 * ```
 */
export function useTelegramWorkoutContext(): TelegramWorkoutContextType {
  const context = useContext(TelegramWorkoutContext);
  if (!context) {
    throw new Error(
      "useTelegramWorkoutContext must be used within TelegramWorkoutProvider"
    );
  }
  return context;
}
