"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Save,
  Trash2,
  Plus,
} from "lucide-react";
import HierarchicalUnitSelector from "@/components/features/problems/HierarchicalUnitSelector";
import { UNITS_HIERARCHY } from "@/lib/data/units";
import type { SearchFilter, SourceListItem } from "@/lib/api/types";

interface SearchOptionsProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  selectedUnits: string[];
  onUnitsChange: (ids: string[]) => void;
  year: string;
  onYearChange: (value: string) => void;
  examSession: string;
  onExamSessionChange: (value: string) => void;
  isChecked: boolean | null;
  onCheckedChange: (value: boolean | null) => void;
  searchFilters: SearchFilter[];
  onLoadFilter: (filter: SearchFilter) => void;
  onSaveFilter: (name: string) => void;
  onDeleteFilter: (id: number) => void;
  sourceList: SourceListItem[];
  onAddSource: (year: string, examSession: string) => void;
  onDeleteSource: (id: number) => void;
  onSearch: () => void;
}

const YEARS = ["", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const EXAM_SESSIONS = [
  { value: "", label: "すべて" },
  { value: "前期", label: "前期" },
  { value: "後期", label: "後期" },
  { value: "一般", label: "一般" },
  { value: "推薦", label: "推薦" },
];

export default function SearchOptions({
  keyword,
  onKeywordChange,
  selectedUnits,
  onUnitsChange,
  year,
  onYearChange,
  examSession,
  onExamSessionChange,
  isChecked,
  onCheckedChange,
  searchFilters,
  onLoadFilter,
  onSaveFilter,
  onDeleteFilter,
  sourceList,
  onAddSource,
  onDeleteSource,
  onSearch,
}: SearchOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [newSourceYear, setNewSourceYear] = useState("2025");
  const [newSourceSession, setNewSourceSession] = useState("前期");

  const handleSaveFilter = () => {
    const name = filterName.trim();
    if (!name) return;
    onSaveFilter(name);
    setFilterName("");
  };

  const handleAddSource = () => {
    if (!newSourceYear) return;
    onAddSource(newSourceYear, newSourceSession);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          検索オプション
          {(selectedUnits.length > 0 || year || isChecked !== null) && (
            <span className="inline-flex items-center rounded-full bg-mongene-green/10 px-2 py-0.5 text-xs font-medium text-green-700">
              フィルタ適用中
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {/* Keyword */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              キーワード
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="問題文を検索..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none transition-colors"
            />
          </div>

          {/* 単元 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              単元
            </label>
            <HierarchicalUnitSelector
              items={UNITS_HIERARCHY}
              selectedIds={selectedUnits}
              onChange={onUnitsChange}
            />
          </div>

          {/* 出典 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              出典
            </label>
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                <option value="">年度</option>
                {YEARS.filter(Boolean).map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                value={examSession}
                onChange={(e) => onExamSessionChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                {EXAM_SESSIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ステータス */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </label>
            <div className="flex items-center gap-4">
              {[
                { value: null, label: "すべて" },
                { value: true, label: "チェック済" },
                { value: false, label: "未チェック" },
              ].map((opt) => (
                <label
                  key={String(opt.value)}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="checked-status"
                    checked={isChecked === opt.value}
                    onChange={() => onCheckedChange(opt.value)}
                    className="h-4 w-4 border-gray-300 text-mongene-green focus:ring-mongene-green"
                  />
                  <span className="text-sm text-gray-600">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 出典リスト管理 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              出典リスト
            </label>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={newSourceYear}
                onChange={(e) => setNewSourceYear(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                {YEARS.filter(Boolean).map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                value={newSourceSession}
                onChange={(e) => setNewSourceSession(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              >
                {EXAM_SESSIONS.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSource}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                追加
              </button>
            </div>
            {sourceList.length > 0 && (
              <div className="space-y-1">
                {sourceList.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                  >
                    <span className="text-sm text-gray-600">
                      {src.year}年 {src.exam_session}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteSource(src.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 保存済みフィルタ */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
              保存済みフィルタ
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="フィルタ名を入力..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none"
              />
              <button
                type="button"
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                保存
              </button>
            </div>
            {searchFilters.length > 0 && (
              <div className="space-y-1">
                {searchFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => onLoadFilter(filter)}
                      className="text-sm text-mongene-blue hover:underline"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFilter(filter.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={onSearch}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-mongene-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-95 active:brightness-90 transition-all"
          >
            <Search className="h-4 w-4" />
            検索する
          </button>
        </div>
      )}
    </div>
  );
}
