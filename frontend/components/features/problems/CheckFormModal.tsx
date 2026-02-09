"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, CheckSquare } from "lucide-react";
import HierarchicalUnitSelector from "@/components/features/problems/HierarchicalUnitSelector";
import { UNITS_HIERARCHY } from "@/lib/data/units";
import type { Problem, CheckInfo } from "@/lib/api/types";

interface CheckFormModalProps {
  problem: Problem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (problemId: number, checkInfo: CheckInfo) => void;
}

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const EXAM_SESSIONS = [
  { value: "前期", label: "前期" },
  { value: "後期", label: "後期" },
  { value: "一般", label: "一般" },
  { value: "推薦", label: "推薦" },
];

const DEFAULT_CHECK_INFO: CheckInfo = {
  problem_text_ok: false,
  solution_ok: false,
  figure_ok: false,
  units: [],
  year: "",
  exam_session: "",
  tags: [],
};

export default function CheckFormModal({
  problem,
  isOpen,
  onClose,
  onSave,
}: CheckFormModalProps) {
  const [checkInfo, setCheckInfo] = useState<CheckInfo>(DEFAULT_CHECK_INFO);

  // Sync local state when problem changes or modal opens
  useEffect(() => {
    if (isOpen && problem) {
      setCheckInfo({
        ...DEFAULT_CHECK_INFO,
        ...problem.check_info,
      });
    }
  }, [isOpen, problem]);

  const handleToggle = useCallback(
    (field: "problem_text_ok" | "solution_ok" | "figure_ok") => {
      setCheckInfo((prev) => ({ ...prev, [field]: !prev[field] }));
    },
    [],
  );

  const handleUnitsChange = useCallback((ids: string[]) => {
    setCheckInfo((prev) => ({ ...prev, units: ids }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(problem.id, checkInfo);
    onClose();
  }, [problem.id, checkInfo, onSave, onClose]);

  if (!isOpen) return null;

  const checks: {
    field: "problem_text_ok" | "solution_ok" | "figure_ok";
    label: string;
  }[] = [
    { field: "problem_text_ok", label: "問題文に問題なし" },
    { field: "solution_ok", label: "解答に問題なし" },
    { field: "figure_ok", label: "図形に問題なし" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <CheckSquare className="h-5 w-5 text-mongene-green" />
            チェック
            <span className="text-sm font-normal text-gray-400">
              #{problem.id}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic checks */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              基本チェック
            </label>
            <div className="space-y-2">
              {checks.map((item) => (
                <label
                  key={item.field}
                  className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checkInfo[item.field]}
                    onChange={() => handleToggle(item.field)}
                    className="h-4 w-4 rounded border-gray-300 text-mongene-green focus:ring-mongene-green"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 単元 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              単元
            </label>
            <HierarchicalUnitSelector
              items={UNITS_HIERARCHY}
              selectedIds={checkInfo.units ?? []}
              onChange={handleUnitsChange}
            />
          </div>

          {/* Year + Exam Session */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
                年度
              </label>
              <select
                value={checkInfo.year ?? ""}
                onChange={(e) =>
                  setCheckInfo((prev) => ({ ...prev, year: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                <option value="">未選択</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
                時期
              </label>
              <select
                value={checkInfo.exam_session ?? ""}
                onChange={(e) =>
                  setCheckInfo((prev) => ({
                    ...prev,
                    exam_session: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                <option value="">未選択</option>
                {EXAM_SESSIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-mongene-green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 transition-all"
          >
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
