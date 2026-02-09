"use client";

import { Eye } from "lucide-react";

interface ProblemPattern {
  content: string;
  solution?: string;
  image_base64?: string | null;
}

interface ThreeProblemsDisplayProps {
  problems: ProblemPattern[];
  onPreview: (index: number) => void;
}

const PATTERN_CONFIG = [
  {
    label: "Pattern A",
    accent: "border-blue-400",
    labelBg: "bg-blue-50 text-blue-700",
    buttonBg: "text-blue-600 hover:bg-blue-50",
  },
  {
    label: "Pattern B",
    accent: "border-purple-400",
    labelBg: "bg-purple-50 text-purple-700",
    buttonBg: "text-purple-600 hover:bg-purple-50",
  },
  {
    label: "Pattern C",
    accent: "border-orange-400",
    labelBg: "bg-orange-50 text-orange-700",
    buttonBg: "text-orange-600 hover:bg-orange-50",
  },
];

export default function ThreeProblemsDisplay({
  problems,
  onPreview,
}: ThreeProblemsDisplayProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {problems.map((problem, idx) => {
        const config = PATTERN_CONFIG[idx] ?? PATTERN_CONFIG[0];
        const truncated =
          problem.content.length > 300
            ? problem.content.slice(0, 300) + "…"
            : problem.content;

        return (
          <div
            key={idx}
            className={`flex flex-col rounded-xl border-t-4 ${config.accent} bg-white shadow-sm border border-gray-200 overflow-hidden`}
          >
            {/* Pattern label */}
            <div className="px-4 pt-4 pb-2">
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${config.labelBg}`}
              >
                {config.label}
              </span>
            </div>

            {/* Content preview */}
            <div className="px-4 py-2 flex-1">
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-5 leading-relaxed">
                {truncated}
              </p>
            </div>

            {/* Image preview */}
            {problem.image_base64 && (
              <div className="px-4 pb-2">
                <img
                  src={`data:image/png;base64,${problem.image_base64}`}
                  alt={`${config.label}の画像`}
                  className="max-h-40 rounded-lg border border-gray-100 object-contain"
                />
              </div>
            )}

            {/* Action */}
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                type="button"
                onClick={() => onPreview(idx)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${config.buttonBg}`}
              >
                <Eye className="h-4 w-4" />
                プレビュー
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
