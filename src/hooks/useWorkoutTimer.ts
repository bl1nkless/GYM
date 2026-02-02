"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface UseWorkoutTimerOptions {
  /** ISO string of when the workout started */
  startedAt: string | null;
  /** Whether the timer should be running */
  isActive?: boolean;
}

interface WorkoutTimerResult {
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Formatted time string (e.g., "01:23:45" or "23:45") */
  formattedTime: string;
  /** Formatted time with labels (e.g., "1ч 23м" or "23м 45с") */
  formattedTimeWithLabels: string;
  /** Hours component */
  hours: number;
  /** Minutes component */
  minutes: number;
  /** Seconds component */
  seconds: number;
}

/**
 * Hook for tracking workout duration with live updates
 */
export function useWorkoutTimer({
  startedAt,
  isActive = true,
}: UseWorkoutTimerOptions): WorkoutTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate initial elapsed time
  const calculateElapsed = useCallback(() => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [startedAt]);

  // Initialize elapsed time
  useEffect(() => {
    setElapsedSeconds(calculateElapsed());
  }, [calculateElapsed]);

  // Update timer every second when active
  useEffect(() => {
    if (!isActive || !startedAt) return;

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt, calculateElapsed]);

  // Calculate time components
  const { hours, minutes, seconds } = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    return { hours: h, minutes: m, seconds: s };
  }, [elapsedSeconds]);

  // Format time as HH:MM:SS or MM:SS
  const formattedTime = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [hours, minutes, seconds]);

  // Format time with Russian labels
  const formattedTimeWithLabels = useMemo(() => {
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    }
    return `${seconds}с`;
  }, [hours, minutes, seconds]);

  return {
    elapsedSeconds,
    formattedTime,
    formattedTimeWithLabels,
    hours,
    minutes,
    seconds,
  };
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes === null || durationMinutes === undefined) {
    return "—";
  }

  if (durationMinutes < 1) {
    return "1м";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}ч ${minutes}м` : `${hours}ч`;
  }

  return `${minutes}м`;
}

/**
 * Calculate duration in minutes between two timestamps
 */
export function calculateDurationMinutes(
  startedAt: string | null,
  finishedAt: string | null
): number | null {
  if (!startedAt || !finishedAt) return null;

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();

  if (end <= start) return null;

  return Math.round((end - start) / (1000 * 60));
}
