"use client";

import type { RecentWorkout } from "@/hooks/useRecentWorkouts";
import { BarbellIcon } from "@/components/icons";
import { WorkoutCard } from "./WorkoutCard";
import { SkeletonList } from "./SkeletonList";
import { EmptyState } from "./EmptyState";

interface WorkoutHistoryProps {
  loading: boolean;
  workouts: RecentWorkout[];
}

export function WorkoutHistory({ loading, workouts }: WorkoutHistoryProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-white">История</h2>

      {loading ? (
        <div className="space-y-3">
          <SkeletonList
            count={3}
            itemClassName="h-20 rounded-2xl border border-zinc-800 bg-zinc-900"
          />
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={
            <BarbellIcon className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
          }
          title="Нет истории тренировок"
        />
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </section>
  );
}
