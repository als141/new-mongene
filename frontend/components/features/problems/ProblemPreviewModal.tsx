"use client";

import { useState, useCallback } from "react";
import {
  X,
  Pencil,
  Printer,
  Save,
  RefreshCw,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { apiClient } from "@/lib/api/client";
import type { Problem, User } from "@/lib/api/types";

interface ProblemPreviewModalProps {
  problem: Problem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Problem) => void;
  onRegenerateGeometry: (problemId: number) => Promise<Problem>;
  userInfo: User | null;
}

type TabKey = "problem" | "solution" | "figure";

export default function ProblemPreviewModal({
  problem,
  isOpen,
  onClose,
  onUpdate,
  onRegenerateGeometry,
  userInfo,
}: ProblemPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("problem");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editSolution, setEditSolution] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const canRegenerateFigure =
    userInfo != null &&
    userInfo.figure_regeneration_count < userInfo.figure_regeneration_limit;

  const handleStartEdit = useCallback(() => {
    if (!problem) return;
    setEditContent(problem.content ?? "");
    setEditSolution(problem.solution ?? "");
    setIsEditing(true);
  }, [problem]);

  const handleSaveEdit = useCallback(async () => {
    if (!problem) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.put<Problem>(
        `/api/v1/problems/${problem.id}`,
        { content: editContent, solution: editSolution },
      );
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  }, [problem, editContent, editSolution, onUpdate]);

  const handleRegenerate = useCallback(async () => {
    if (!problem) return;
    setIsRegenerating(true);
    try {
      const updated = await onRegenerateGeometry(problem.id);
      onUpdate(updated);
    } catch (err) {
      console.error("Failed to regenerate figure:", err);
    } finally {
      setIsRegenerating(false);
    }
  }, [problem, onRegenerateGeometry, onUpdate]);

  const handlePrint = useCallback(() => {
    if (!problem) return;

    const figureHtml = problem.image_base64
      ? `<div style="margin:24px 0;text-align:center;">
           <img src="data:image/png;base64,${problem.image_base64}"
                style="max-width:100%;max-height:400px;border:1px solid #eee;border-radius:8px;" />
         </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>問題 #${problem.id}</title>
  <style>
    body { font-family: "Noto Sans JP", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #222; }
    h1 { font-size: 18px; border-bottom: 2px solid #8DDB39; padding-bottom: 8px; }
    h2 { font-size: 15px; margin-top: 32px; color: #555; }
    pre { white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>問題 #${problem.id}</h1>
  <pre>${problem.content ?? ""}</pre>
  ${figureHtml}
  <h2>解答</h2>
  <pre>${problem.solution ?? ""}</pre>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }, [problem]);

  if (!isOpen || !problem) return null;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "problem", label: "問題", icon: <FileText className="h-4 w-4" /> },
    { key: "solution", label: "解答", icon: <BookOpen className="h-4 w-4" /> },
    { key: "figure", label: "図形", icon: <ImageIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 mx-4 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            問題プレビュー{" "}
            <span className="text-sm font-normal text-gray-400">
              #{problem.id}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  編集
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  印刷
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-mongene-green text-mongene-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Problem Tab */}
          {activeTab === "problem" && (
            <div>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      問題文
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={12}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 font-mono leading-relaxed focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none resize-y"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      解答
                    </label>
                    <textarea
                      value={editSolution}
                      onChange={(e) => setEditSolution(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 font-mono leading-relaxed focus:border-mongene-green focus:ring-1 focus:ring-mongene-green outline-none resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-mongene-green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-50 transition-all"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <MarkdownRenderer content={problem.content ?? ""} />
              )}
            </div>
          )}

          {/* Solution Tab */}
          {activeTab === "solution" && (
            <div>
              {problem.solution ? (
                <MarkdownRenderer content={problem.solution} />
              ) : (
                <p className="text-sm text-gray-400 italic">
                  解答が登録されていません
                </p>
              )}
            </div>
          )}

          {/* Figure Tab */}
          {activeTab === "figure" && (
            <div className="space-y-4">
              {problem.image_base64 ? (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${problem.image_base64}`}
                    alt="問題の図形"
                    className="max-w-full max-h-[60vh] rounded-lg border border-gray-200 shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p className="text-sm">図形がありません</p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={!canRegenerateFigure || isRegenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-mongene-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  図形を再生成
                </button>
              </div>
              {userInfo && (
                <p className="text-center text-xs text-gray-400">
                  再生成回数: {userInfo.figure_regeneration_count} /{" "}
                  {userInfo.figure_regeneration_limit}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
