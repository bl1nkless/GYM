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
              100
          )
        )
      : 0;

  return (
    <div
      className="cursor-pointer rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5 transition-all hover:border-zinc-700"
      onClick={onClick}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <Scale className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Вес тела</h3>
            <p className="text-xs text-zinc-500">
              {currentWeight ? "Нажми чтобы обновить" : "Добавить вес"}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600" />
      </div>

      {currentWeight ? (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">
              {currentWeight}
            </span>
            <span className="pb-1 text-lg text-zinc-500">кг</span>
            {weightDiff !== null && (
              <div
                className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-1 ${
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
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
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
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{
                    width: `${isNaN(progressPercent) ? 0 : progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-zinc-500">
            Добавь свой вес для отслеживания прогресса
          </p>
        </div>
      )}
    </div>
  );
}
