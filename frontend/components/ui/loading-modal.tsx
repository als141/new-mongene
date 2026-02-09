"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  stage: number;
  totalStages: number;
  stageMessage: string;
  isDemo?: boolean;
}

export function LoadingModal({
  isOpen,
  stage,
  totalStages,
  stageMessage,
  isDemo = false,
}: LoadingModalProps) {
  if (!isOpen) return null;

  const progressPercent = totalStages > 0 ? (stage / totalStages) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-mongene-green" />
        </div>

        {/* Stage progress text */}
        <p className="mb-3 text-center text-sm font-semibold text-gray-700">
          ステージ {stage}/{totalStages}
        </p>

        {/* Progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-mongene-green transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stage message */}
        <p className="text-center text-sm text-gray-600">{stageMessage}</p>

        {/* Demo badge */}
        {isDemo && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              デモモード
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
