"use client";

import { cn } from "@/lib/utils";

export interface WeekDay {
  day: string;
  date: string;
  active: boolean;
}

interface CalendarStripProps {
  weekDays: WeekDay[];
}

export function CalendarStrip({ weekDays }: CalendarStripProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      {weekDays.map((item) => (
        <div
          key={`${item.day}-${item.date}`}
          className="group flex cursor-pointer flex-col items-center gap-2"
        >
          <span
            className={cn(
              "text-xs font-medium",
              item.active
                ? "text-orange-500"
                : "text-zinc-500 group-hover:text-zinc-300"
            )}
          >
            {item.day}
          </span>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
              item.active
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-transparent text-zinc-400 group-hover:bg-zinc-800"
            )}
          >
            {item.date}
          </div>
          {item.active && <div className="h-1 w-1 rounded-full bg-white" />}
        </div>
      ))}
    </div>
  );
}
