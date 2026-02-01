"use client";

import { Scale, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface WeightCardProps {
  currentWeight: number | null;
  goalWeight: number | null;
  weightHistory: { weight: number; date: string }[];
  onClick: () => void;
}

export default function WeightCard({
  currentWeight,
  goalWeight,
  weightHistory,
  onClick,
}: WeightCardProps) {
  const weightDiff =
    currentWeight && goalWeight ? currentWeight - goalWeight : null;
  const isGaining =
    goalWeight && currentWeight ? goalWeight > currentWeight : false;

  const progressPercent =
    currentWeight && goalWeight && weightHistory.length > 0
      ? Math.min(
          100,
          Math.abs(
            ((currentWeight - weightHistory[0].weight) /
              (goalWeight - weightHistory[0].weight)) *
              100,
          ),
        )
      : 0;

  return (
    <div
      className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl p-5 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Вес тела</h3>
            <p className="text-xs text-zinc-500">
              {currentWeight ? "Нажми чтобы обновить" : "Добавить вес"}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600" />
      </div>

      {currentWeight ? (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">
              {currentWeight}
            </span>
            <span className="text-lg text-zinc-500 pb-1">кг</span>
            {weightDiff !== null && (
              <div
                className={`flex items-center gap-1 ml-auto px-2 py-1 rounded-lg ${
                  isGaining
                    ? weightDiff < 0
                      ? "bg-green-500/20 text-green-400"
                      : "bg-orange-500/20 text-orange-400"
                    : weightDiff > 0
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-green-500/20 text-green-400"
                }`}
              >
                {weightDiff > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-xs font-medium">
                  {Math.abs(weightDiff).toFixed(1)} кг до цели
                </span>
              </div>
            )}
          </div>

          {goalWeight && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Цель: {goalWeight} кг</span>
                <span className="text-zinc-400">
                  {isNaN(progressPercent) ? 0 : progressPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${isNaN(progressPercent) ? 0 : progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-zinc-500 text-sm">
            Добавь свой вес для отслеживания прогресса
          </p>
        </div>
      )}
    </div>
  );
}
