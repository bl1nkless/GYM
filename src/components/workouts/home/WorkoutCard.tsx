"use client";

import Link from "next/link";
import type { RecentWorkout } from "@/hooks/useRecentWorkouts";
import { BarbellIcon, ChevronRightIcon } from "@/components/icons";

interface WorkoutCardProps {
  workout: RecentWorkout;
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  return (
    <Link
      href={`/app/workouts/${workout.id}`}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
            <BarbellIcon />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{workout.title}</h3>
            <p className="text-xs text-zinc-500">{workout.date}</p>
          </div>
        </div>
        <ChevronRightIcon className="text-zinc-600" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {workout.tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {workout.isPr && (
            <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-500">
              PR
            </span>
          )}
          <span className="text-zinc-400">{workout.duration}</span>
          {workout.volume !== "-" && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-200">{workout.volume}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
