"use client";

import type { ExerciseHistory } from "@/lib/analytics/buildExerciseStats";
import { TrendingUp, TrendingDown, Trophy, ChevronDown, X } from "lucide-react";

interface ExerciseCardProps {
  data: ExerciseHistory;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
}

export default function ExerciseCard({
  data,
  isExpanded,
  onToggleExpand,
  onRemove,
}: ExerciseCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Main Row */}
      <div
        className="cursor-pointer p-4 transition-colors hover:bg-zinc-800/50"
        onClick={onToggleExpand}
      >
        {/* Top Line - Name and Weight */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </div>
            <h3 className="truncate font-medium text-white">
              {data.exerciseName}
            </h3>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            {/* Рабочий вес */}
            <p className="text-lg font-bold whitespace-nowrap text-white">
              {data.lastWeight}
              <span className="ml-1 text-sm text-zinc-500">кг</span>
            </p>

            {/* Рекорд */}
            {data.maxWeight > data.lastWeight && (
              <div className="flex items-center gap-1 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-1">
                <Trophy className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">
                  {data.maxWeight}
                </span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Line - Date */}
        <p className="mt-1 ml-7 text-xs text-zinc-500">
          {new Date(data.lastDate).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
          })}
          {data.history.length > 1 && (
            <span className="text-zinc-600">
              {" "}
              • {data.history.length} записей
            </span>
          )}
        </p>
      </div>

      {/* History Section */}
      {isExpanded && data.history.length > 0 && (
        <ExerciseHistory history={data.history} maxWeight={data.maxWeight} />
      )}
    </div>
  );
}

// Подкомпонент истории
function ExerciseHistory({
  history,
  maxWeight,
}: {
  history: { date: string; weight: number }[];
  maxWeight: number;
}) {
  // Инвертируем для отображения от новых к старым
  const reversedHistory = [...history].reverse();

  return (
    <div className="px-4 pt-0 pb-4">
      <div className="border-t border-zinc-800 pt-3">
        <p className="mb-3 text-xs tracking-wide text-zinc-500 uppercase">
          История изменений
        </p>
        <div className="space-y-2">
          {reversedHistory.map((entry, index) => {
            const prevEntry = reversedHistory[index + 1];
            const diff = prevEntry ? entry.weight - prevEntry.weight : 0;
            const isRecord = entry.weight === maxWeight;

            return (
              <div
                key={entry.date}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  index === 0 ? "bg-zinc-800/50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">
                    {new Date(entry.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {isRecord && (
                    <div className="flex items-center gap-1 rounded bg-orange-500/20 px-1.5 py-0.5">
                      <Trophy className="h-3 w-3 text-orange-400" />
                      <span className="text-[10px] font-medium text-orange-400">
                        PR
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">
                    {entry.weight} кг
                  </span>
                  {diff !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-xs ${
                        diff > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {diff > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(diff)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
