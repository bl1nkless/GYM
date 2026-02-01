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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Main Row */}
      <div
        className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Top Line - Name and Weight */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </div>
            <h3 className="font-medium text-white truncate">
              {data.exerciseName}
            </h3>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Рабочий вес */}
            <p className="text-lg font-bold text-white whitespace-nowrap">
              {data.lastWeight}
              <span className="text-sm text-zinc-500 ml-1">кг</span>
            </p>

            {/* Рекорд */}
            {data.maxWeight > data.lastWeight && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Trophy className="w-3.5 h-3.5 text-orange-400" />
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
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Line - Date */}
        <p className="text-xs text-zinc-500 mt-1 ml-7">
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
    <div className="px-4 pb-4 pt-0">
      <div className="border-t border-zinc-800 pt-3">
        <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wide">
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
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
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
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 rounded">
                      <Trophy className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-orange-400 font-medium">
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
                      className={`text-xs flex items-center gap-0.5 ${
                        diff > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {diff > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
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
