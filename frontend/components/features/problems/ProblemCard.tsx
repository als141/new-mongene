"use client";

import { Eye, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

export interface ProblemCardProblem {
  id: string;
  content: string;
  image_base64?: string | null;
  check_info?: { checked: boolean } | null;
  created_at: string;
}

interface ProblemCardProps {
  problem: ProblemCardProblem;
  onPreview: (problem: ProblemCardProblem) => void;
  onDelete: (id: string) => void;
}

export default function ProblemCard({ problem, onPreview, onDelete }: ProblemCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isChecked = problem.check_info?.checked ?? false;

  const truncated =
    problem.content.length > 200
      ? problem.content.slice(0, 200) + "…"
      : problem.content;

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(problem.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs text-gray-400">
          {new Date(problem.created_at).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        {isChecked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            チェック済
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <Circle className="h-3.5 w-3.5" />
            未チェック
          </span>
        )}
      </div>

      {/* Content preview */}
      <div className="px-4 py-2 flex-1">
        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-8 leading-relaxed">
          {truncated}
        </p>
      </div>

      {/* Image preview */}
      {problem.image_base64 && (
        <div className="px-4 pb-2">
          <img
            src={`data:image/png;base64,${problem.image_base64}`}
            alt="問題の画像"
            className="max-h-32 rounded-lg border border-gray-100 object-contain"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => onPreview(problem)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          プレビュー
        </button>

        <button
          type="button"
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            confirmDelete
              ? "bg-red-600 text-white hover:bg-red-700"
              : "text-red-500 hover:bg-red-50"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? "本当に削除" : "削除"}
        </button>
      </div>
    </div>
  );
}
