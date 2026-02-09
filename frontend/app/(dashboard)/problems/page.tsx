"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Sparkles, Upload, X, ChevronDown, ChevronUp } from "lucide-react";

import Header from "@/components/layout/Header";
import MainTabs from "@/components/features/problems/MainTabs";
import ProblemCard from "@/components/features/problems/ProblemCard";
import type { ProblemCardProblem } from "@/components/features/problems/ProblemCard";
import FileUpload from "@/components/features/problems/FileUpload";
import ThreeProblemsDisplay from "@/components/features/problems/ThreeProblemsDisplay";
import HierarchicalUnitSelector from "@/components/features/problems/HierarchicalUnitSelector";
import { Button } from "@/components/ui/button";
import { LoadingModal } from "@/components/ui/loading-modal";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { API_CONFIG } from "@/lib/config/api";
import { UNITS_HIERARCHY } from "@/lib/data/units";
import type { Problem, User, SSEStageEvent } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenerationMode = "single" | "fiveStage" | "threeProblems";
type ActiveTab = "list" | "generate";

interface GeneratedProblem {
  content: string;
  solution?: string;
  image_base64?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXCLUDED_UNIT_TAGS = [
  "多項式",
  "平方根",
  "二次方程式",
  "二次関数",
  "相似",
  "円周角",
  "三平方の定理",
  "標本調査",
] as const;

const GENERATION_MODES: { key: GenerationMode; label: string; description: string }[] = [
  {
    key: "single",
    label: "単一生成",
    description: "テキストプロンプトから1問を生成します",
  },
  {
    key: "fiveStage",
    label: "5段階生成",
    description: "5ステージの段階的プロセスで高品質な問題を生成します",
  },
  {
    key: "threeProblems",
    label: "3問題生成",
    description: "問題・解答ファイルから3パターンの類題を生成します",
  },
];

const FIVE_STAGE_MESSAGES: Record<number, string> = {
  1: "問題の分析中...",
  2: "類似パターンの探索中...",
  3: "問題文の生成中...",
  4: "解答の作成中...",
  5: "図の生成と最終チェック中...",
};

// ---------------------------------------------------------------------------
// BackgroundShapes
// ---------------------------------------------------------------------------

function BackgroundShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-green-50 opacity-60 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-blue-50 opacity-50 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-yellow-50 opacity-40 blur-3xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchOptions (Accordion)
// ---------------------------------------------------------------------------

interface SearchOptionsProps {
  excludedUnits: string[];
  onExcludedUnitsChange: (units: string[]) => void;
  selectedHierarchicalUnits: string[];
  onHierarchicalUnitsChange: (ids: string[]) => void;
}

function SearchOptions({
  excludedUnits,
  onExcludedUnitsChange,
  selectedHierarchicalUnits,
  onHierarchicalUnitsChange,
}: SearchOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleExcludedUnit = (unit: string) => {
    if (excludedUnits.includes(unit)) {
      onExcludedUnitsChange(excludedUnits.filter((u) => u !== unit));
    } else {
      onExcludedUnitsChange([...excludedUnits, unit]);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <span>詳細検索オプション</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-5">
          {/* Excluded units tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              除外する単元（クリックで切り替え）
            </label>
            <div className="flex flex-wrap gap-2">
              {EXCLUDED_UNIT_TAGS.map((unit) => {
                const isExcluded = excludedUnits.includes(unit);
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => toggleExcludedUnit(unit)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isExcluded
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {isExcluded && <X className="h-3 w-3" />}
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hierarchical unit selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              単元で絞り込み
            </label>
            <HierarchicalUnitSelector
              items={UNITS_HIERARCHY}
              selectedIds={selectedHierarchicalUnits}
              onChange={onHierarchicalUnitsChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProblemPreviewModal
// ---------------------------------------------------------------------------

interface ProblemPreviewModalProps {
  problem: ProblemCardProblem | GeneratedProblem | null;
  isOpen: boolean;
  onClose: () => void;
  solution?: string;
}

function ProblemPreviewModal({ problem, isOpen, onClose, solution }: ProblemPreviewModalProps) {
  if (!isOpen || !problem) return null;

  const content = problem.content;
  const solutionText =
    solution ?? ("solution" in problem ? (problem as GeneratedProblem).solution : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">問題プレビュー</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Problem content */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              問題文
            </h3>
            <div className="rounded-lg bg-gray-50 p-4">
              <MarkdownRenderer content={content} />
            </div>
          </div>

          {/* Image */}
          {problem.image_base64 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                図
              </h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <img
                  src={`data:image/png;base64,${problem.image_base64}`}
                  alt="問題の図"
                  className="max-h-96 rounded-lg object-contain"
                />
              </div>
            </div>
          )}

          {/* Solution */}
          {solutionText && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                解答
              </h3>
              <div className="rounded-lg bg-blue-50 p-4">
                <MarkdownRenderer content={solutionText} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ProblemsPage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  // ---- User info ----
  const [userInfo, setUserInfo] = useState<User | null>(null);

  // ---- Tab ----
  const [activeTab, setActiveTab] = useState<ActiveTab>("list");

  // ---- Problem list state ----
  const [problems, setProblems] = useState<ProblemCardProblem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [excludedUnits, setExcludedUnits] = useState<string[]>([]);
  const [selectedHierarchicalUnits, setSelectedHierarchicalUnits] = useState<string[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);

  // ---- Preview modal ----
  const [previewProblem, setPreviewProblem] = useState<
    ProblemCardProblem | GeneratedProblem | null
  >(null);
  const [previewSolution, setPreviewSolution] = useState<string | undefined>(undefined);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ---- Generation state ----
  const [generationMode, setGenerationMode] = useState<GenerationMode>("single");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- SSE stage (five-stage & three-problems) ----
  const [sseStage, setSseStage] = useState(0);
  const [sseTotalStages, setSseTotalStages] = useState(5);
  const [stageMessage, setStageMessage] = useState("");

  // ---- Generated results ----
  const [generatedProblems, setGeneratedProblems] = useState<GeneratedProblem[]>([]);
  const [threeProblems, setThreeProblems] = useState<GeneratedProblem[]>([]);

  // ---- Three-problems mode files ----
  const [problemFiles, setProblemFiles] = useState<File[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const [threeExcludedUnits, setThreeExcludedUnits] = useState<string[]>([]);

  // ---- Abort controller for SSE ----
  const abortRef = useRef<AbortController | null>(null);

  // =========================================================================
  // Auth & User fetch
  // =========================================================================

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!clerkUser) {
      router.push("/sign-in");
      return;
    }
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClerkLoaded, clerkUser]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_CONFIG.API_URL}/users/me`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data: User = await res.json();
        setUserInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, [getToken]);

  // =========================================================================
  // Problem list fetch
  // =========================================================================

  const fetchProblems = useCallback(async () => {
    setIsLoadingProblems(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (searchKeyword.trim()) params.set("keyword", searchKeyword.trim());
      if (excludedUnits.length > 0) params.set("excluded_units", excludedUnits.join(","));
      if (selectedHierarchicalUnits.length > 0) {
        params.set("units", selectedHierarchicalUnits.join(","));
      }

      const res = await fetch(
        `${API_CONFIG.API_URL}/problems?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (res.ok) {
        const data: Problem[] = await res.json();
        const mapped: ProblemCardProblem[] = data.map((p) => ({
          id: String(p.id),
          content: p.content ?? "",
          image_base64: p.image_base64 ?? null,
          check_info: p.check_info
            ? {
                checked:
                  p.check_info.problem_text_ok &&
                  p.check_info.solution_ok &&
                  p.check_info.figure_ok,
              }
            : null,
          created_at: p.created_at ?? new Date().toISOString(),
        }));
        setProblems(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch problems:", err);
    } finally {
      setIsLoadingProblems(false);
    }
  }, [getToken, searchKeyword, excludedUnits, selectedHierarchicalUnits]);

  useEffect(() => {
    if (userInfo) {
      fetchProblems();
    }
  }, [userInfo, fetchProblems]);

  // =========================================================================
  // Problem deletion
  // =========================================================================

  const handleDeleteProblem = useCallback(
    async (id: string) => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_CONFIG.API_URL}/problems/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          setProblems((prev) => prev.filter((p) => p.id !== id));
        }
      } catch (err) {
        console.error("Failed to delete problem:", err);
      }
    },
    [getToken],
  );

  // =========================================================================
  // Preview handlers
  // =========================================================================

  const handlePreviewCard = useCallback((problem: ProblemCardProblem) => {
    setPreviewProblem(problem);
    setPreviewSolution(undefined);
    setShowPreviewModal(true);
  }, []);

  const handlePreviewGenerated = useCallback(
    (index: number) => {
      const problem = threeProblems[index];
      if (problem) {
        setPreviewProblem(problem);
        setPreviewSolution(problem.solution);
        setShowPreviewModal(true);
      }
    },
    [threeProblems],
  );

  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewProblem(null);
    setPreviewSolution(undefined);
  }, []);

  // =========================================================================
  // Generation limit check
  // =========================================================================

  const canGenerate = useCallback((): boolean => {
    if (!userInfo) return false;
    return userInfo.problem_generation_count < userInfo.problem_generation_limit;
  }, [userInfo]);

  const remainingGenerations = useCallback((): number => {
    if (!userInfo) return 0;
    return Math.max(0, userInfo.problem_generation_limit - userInfo.problem_generation_count);
  }, [userInfo]);

  // =========================================================================
  // SSE parser helper
  // =========================================================================

  const parseSSELine = useCallback((line: string): SSEStageEvent | null => {
    if (!line.startsWith("data: ")) return null;
    try {
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) return null;
      const parsed = JSON.parse(jsonStr);
      return { event: parsed.event ?? "stage", data: parsed };
    } catch {
      return null;
    }
  }, []);

  // =========================================================================
  // Single generation
  // =========================================================================

  const handleSingleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating || !canGenerate()) return;

    setIsGenerating(true);
    setGeneratedProblems([]);
    try {
      const token = await getToken();
      const res = await fetch(`${API_CONFIG.API_URL}/generate-problem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (res.ok) {
        const data: Problem = await res.json();
        const generated: GeneratedProblem = {
          content: data.content ?? "",
          solution: data.solution,
          image_base64: data.image_base64 ?? null,
        };
        setGeneratedProblems([generated]);
        setPreviewProblem(generated);
        setPreviewSolution(generated.solution);
        setShowPreviewModal(true);

        // Refresh user info (generation count)
        fetchUserInfo();
        fetchProblems();
      } else {
        const err = await res.json().catch(() => ({ detail: "生成に失敗しました" }));
        alert(err.detail || "生成に失敗しました");
      }
    } catch (err) {
      console.error("Single generation failed:", err);
      alert("生成中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, canGenerate, getToken, fetchUserInfo, fetchProblems]);

  // =========================================================================
  // Five-stage SSE generation
  // =========================================================================

  const handleFiveStageGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating || !canGenerate()) return;

    setIsGenerating(true);
    setGeneratedProblems([]);
    setSseStage(0);
    setSseTotalStages(5);
    setStageMessage("生成を開始しています...");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.API_URL}/generate-problem-sse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "生成に失敗しました" }));
        throw new Error(err.detail || "生成に失敗しました");
      }

      if (!response.body) {
        throw new Error("ストリーミングレスポンスが取得できません");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let finalProblem: GeneratedProblem | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === ":") continue;

          const parsed = parseSSELine(trimmed);
          if (!parsed) continue;

          const { data } = parsed;

          if (data.stage !== undefined) {
            const stage = data.stage;
            const total = data.total ?? 5;
            setSseStage(stage);
            setSseTotalStages(total);
            setStageMessage(
              data.message ?? FIVE_STAGE_MESSAGES[stage] ?? `ステージ ${stage}/${total}`,
            );
          }

          if (data.content) {
            finalProblem = {
              content: data.content,
              solution: typeof data.solution === "string" ? data.solution : undefined,
              image_base64: data.image_base64 ?? null,
            };
          }

          if (data.error) {
            throw new Error(data.error);
          }
        }
      }

      if (finalProblem) {
        setGeneratedProblems([finalProblem]);
        setPreviewProblem(finalProblem);
        setPreviewSolution(finalProblem.solution);
        setShowPreviewModal(true);
        fetchUserInfo();
        fetchProblems();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Five-stage generation failed:", err);
        alert((err as Error).message || "生成中にエラーが発生しました");
      }
    } finally {
      setIsGenerating(false);
      setSseStage(0);
      setStageMessage("");
      abortRef.current = null;
    }
  }, [prompt, isGenerating, canGenerate, getToken, parseSSELine, fetchUserInfo, fetchProblems]);

  // =========================================================================
  // Three-problems SSE generation
  // =========================================================================

  const handleThreeProblemsGenerate = useCallback(async () => {
    if (isGenerating || !canGenerate()) return;
    if (problemFiles.length === 0) {
      alert("問題ファイルをアップロードしてください");
      return;
    }

    setIsGenerating(true);
    setThreeProblems([]);
    setSseStage(0);
    setSseTotalStages(15);
    setStageMessage("ファイルを解析しています...");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();

      const formData = new FormData();
      problemFiles.forEach((f) => formData.append("problem_files", f));
      solutionFiles.forEach((f) => formData.append("solution_files", f));
      if (threeExcludedUnits.length > 0) {
        formData.append("excluded_units", JSON.stringify(threeExcludedUnits));
      }

      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_CONFIG.API_URL}/generate-three-problems-sse`, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "生成に失敗しました" }));
        throw new Error(err.detail || "生成に失敗しました");
      }

      if (!response.body) {
        throw new Error("ストリーミングレスポンスが取得できません");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      const collectedProblems: GeneratedProblem[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === ":") continue;

          const parsed = parseSSELine(trimmed);
          if (!parsed) continue;

          const { data } = parsed;

          if (data.stage !== undefined) {
            const stage = data.stage;
            const total = data.total ?? 15;
            setSseStage(stage);
            setSseTotalStages(total);

            // Compute stage label with pattern info
            let msg = data.message;
            if (!msg) {
              const patternLabel = data.pattern ?? "";
              const patternStage = data.pattern_stage ?? 0;
              msg = patternLabel
                ? `${patternLabel}: ステージ ${patternStage}/5`
                : `ステージ ${stage}/${total}`;
            }
            setStageMessage(msg);
          }

          if (data.content) {
            collectedProblems.push({
              content: data.content,
              solution: typeof data.solution === "string" ? data.solution : undefined,
              image_base64: data.image_base64 ?? null,
            });
          }

          if (data.problems && Array.isArray(data.problems)) {
            for (const p of data.problems) {
              collectedProblems.push({
                content: p.content ?? "",
                solution: p.solution,
                image_base64: p.image_base64 ?? null,
              });
            }
          }

          if (data.error) {
            throw new Error(data.error);
          }
        }
      }

      if (collectedProblems.length > 0) {
        setThreeProblems(collectedProblems.slice(0, 3));
        fetchUserInfo();
        fetchProblems();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Three-problems generation failed:", err);
        alert((err as Error).message || "生成中にエラーが発生しました");
      }
    } finally {
      setIsGenerating(false);
      setSseStage(0);
      setStageMessage("");
      abortRef.current = null;
    }
  }, [
    isGenerating,
    canGenerate,
    problemFiles,
    solutionFiles,
    threeExcludedUnits,
    getToken,
    parseSSELine,
    fetchUserInfo,
    fetchProblems,
  ]);

  // =========================================================================
  // Generation dispatch
  // =========================================================================

  const handleGenerate = useCallback(() => {
    switch (generationMode) {
      case "single":
        handleSingleGenerate();
        break;
      case "fiveStage":
        handleFiveStageGenerate();
        break;
      case "threeProblems":
        handleThreeProblemsGenerate();
        break;
    }
  }, [generationMode, handleSingleGenerate, handleFiveStageGenerate, handleThreeProblemsGenerate]);

  // =========================================================================
  // Cancel generation
  // =========================================================================

  const handleCancelGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
    setSseStage(0);
    setStageMessage("");
  }, []);

  // =========================================================================
  // Keyword search on Enter
  // =========================================================================

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        fetchProblems();
      }
    },
    [fetchProblems],
  );

  // =========================================================================
  // Filtered problems (client-side keyword filter for instant feedback)
  // =========================================================================

  const filteredProblems = problems.filter((p) => {
    if (!searchKeyword.trim()) return true;
    return p.content.toLowerCase().includes(searchKeyword.toLowerCase());
  });

  // =========================================================================
  // Render
  // =========================================================================

  const isDemo = userInfo?.role === "demo";

  return (
    <>
      <Header
        user={
          userInfo
            ? { role: userInfo.role, profile_image: userInfo.profile_image }
            : null
        }
      />
      <BackgroundShapes />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">問題管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            数学問題の一覧表示・検索・新規生成を行います
          </p>
        </div>

        {/* Generation limit indicator */}
        {userInfo && (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <Sparkles className="h-4 w-4 text-mongene-green" />
              <span className="text-sm text-gray-600">
                生成残り:{" "}
                <span className="font-bold text-gray-900">
                  {remainingGenerations()}
                </span>
                <span className="text-gray-400">
                  {" "}
                  / {userInfo.problem_generation_limit}
                </span>
              </span>
            </div>
            {isDemo && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                デモモード
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <MainTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {/* ================================================================ */}
          {/* Problem List Tab                                                  */}
          {/* ================================================================ */}
          {activeTab === "list" && (
            <div className="space-y-5">
              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="キーワードで検索..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 shadow-sm transition-colors focus:border-mongene-green focus:outline-none focus:ring-1 focus:ring-mongene-green"
                  />
                </div>
                <Button
                  onClick={fetchProblems}
                  variant="outline"
                  size="default"
                  disabled={isLoadingProblems}
                >
                  <Search className="mr-1.5 h-4 w-4" />
                  検索
                </Button>
              </div>

              {/* Search options accordion */}
              <SearchOptions
                excludedUnits={excludedUnits}
                onExcludedUnitsChange={setExcludedUnits}
                selectedHierarchicalUnits={selectedHierarchicalUnits}
                onHierarchicalUnitsChange={setSelectedHierarchicalUnits}
              />

              {/* Problem grid */}
              {isLoadingProblems ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-mongene-green" />
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    問題が見つかりません
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    検索条件を変更するか、新しい問題を生成してください
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab("generate")}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    問題を生成する
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProblems.map((problem) => (
                    <ProblemCard
                      key={problem.id}
                      problem={problem}
                      onPreview={handlePreviewCard}
                      onDelete={handleDeleteProblem}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* Problem Generation Tab                                            */}
          {/* ================================================================ */}
          {activeTab === "generate" && (
            <div className="space-y-6">
              {/* Mode selector */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  生成モード
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {GENERATION_MODES.map((mode) => {
                    const isSelected = generationMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setGenerationMode(mode.key)}
                        disabled={isGenerating}
                        className={`relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? "border-mongene-green bg-green-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        } ${isGenerating ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        {/* Radio indicator */}
                        <div className="mb-2 flex items-center gap-2">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? "border-mongene-green"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-2.5 w-2.5 rounded-full bg-mongene-green" />
                            )}
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              isSelected ? "text-mongene-green" : "text-gray-700"
                            }`}
                          >
                            {mode.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {mode.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---- Single mode ---- */}
              {generationMode === "single" && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                  <div>
                    <label
                      htmlFor="single-prompt"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      プロンプト
                    </label>
                    <textarea
                      id="single-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例: 三平方の定理を使った直角三角形の辺の長さを求める問題を作成してください"
                      rows={4}
                      disabled={isGenerating}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-mongene-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-mongene-green disabled:opacity-60"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      生成したい問題の内容や条件を自由に記述してください
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating || !canGenerate()}
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          生成する
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ---- Five-stage mode ---- */}
              {generationMode === "fiveStage" && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                  <div>
                    <label
                      htmlFor="five-stage-prompt"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      プロンプト
                    </label>
                    <textarea
                      id="five-stage-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例: 円周角の定理を使って角度を求める問題。図を含めて作成してください"
                      rows={4}
                      disabled={isGenerating}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-mongene-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-mongene-green disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-lg bg-blue-50 px-4 py-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">
                      5段階生成について
                    </p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      問題分析 → 類似パターン探索 → 問題文生成 → 解答作成 →
                      図の生成・最終チェック の5ステージで段階的に高品質な問題を生成します。
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      より精度の高い問題を段階的に生成します
                    </p>
                    <div className="flex items-center gap-2">
                      {isGenerating && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={handleCancelGeneration}
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          キャンセル
                        </Button>
                      )}
                      <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating || !canGenerate()}
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            5段階生成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Three-problems mode ---- */}
              {generationMode === "threeProblems" && (
                <div className="space-y-5">
                  {/* File uploads */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
                    <FileUpload
                      label="問題ファイル（必須）"
                      files={problemFiles}
                      onFilesChange={setProblemFiles}
                    />
                    <FileUpload
                      label="解答ファイル（任意）"
                      files={solutionFiles}
                      onFilesChange={setSolutionFiles}
                    />
                  </div>

                  {/* Excluded units */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      除外する単元（選択した単元は生成に使用されません）
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EXCLUDED_UNIT_TAGS.map((unit) => {
                        const isExcluded = threeExcludedUnits.includes(unit);
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => {
                              if (isExcluded) {
                                setThreeExcludedUnits((prev) =>
                                  prev.filter((u) => u !== unit),
                                );
                              } else {
                                setThreeExcludedUnits((prev) => [...prev, unit]);
                              }
                            }}
                            disabled={isGenerating}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              isExcluded
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            } ${isGenerating ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {isExcluded && <X className="h-3 w-3" />}
                            {unit}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="rounded-lg bg-purple-50 px-4 py-3">
                    <p className="text-xs font-medium text-purple-700 mb-1">
                      3問題生成について
                    </p>
                    <p className="text-xs text-purple-600 leading-relaxed">
                      アップロードした問題を分析し、難易度や構造が異なる3パターン（Pattern A / B /
                      C）の類題を自動生成します。各パターンは5ステージ（計15ステージ）で処理されます。
                    </p>
                  </div>

                  {/* Generate button */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {problemFiles.length > 0
                        ? `${problemFiles.length}件の問題ファイルを選択中`
                        : "問題ファイルをアップロードしてください"}
                    </p>
                    <div className="flex items-center gap-2">
                      {isGenerating && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={handleCancelGeneration}
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          キャンセル
                        </Button>
                      )}
                      <Button
                        onClick={handleGenerate}
                        disabled={
                          problemFiles.length === 0 || isGenerating || !canGenerate()
                        }
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            3問題生成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Generated results (single / five-stage) ---- */}
              {generatedProblems.length > 0 && generationMode !== "threeProblems" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">生成結果</h3>
                  {generatedProblems.map((gp, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-white p-5"
                    >
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          問題文
                        </h4>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <MarkdownRenderer content={gp.content} />
                        </div>
                      </div>

                      {gp.image_base64 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            図
                          </h4>
                          <img
                            src={`data:image/png;base64,${gp.image_base64}`}
                            alt="生成された図"
                            className="max-h-64 rounded-lg border border-gray-100 object-contain"
                          />
                        </div>
                      )}

                      {gp.solution && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            解答
                          </h4>
                          <div className="rounded-lg bg-blue-50 p-4">
                            <MarkdownRenderer content={gp.solution} />
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPreviewProblem(gp);
                            setPreviewSolution(gp.solution);
                            setShowPreviewModal(true);
                          }}
                        >
                          全画面プレビュー
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Three-problems results ---- */}
              {threeProblems.length > 0 && generationMode === "threeProblems" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    生成結果（3パターン）
                  </h3>
                  <ThreeProblemsDisplay
                    problems={threeProblems}
                    onPreview={handlePreviewGenerated}
                  />
                </div>
              )}

              {/* Generation limit warning */}
              {userInfo && !canGenerate() && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-800">
                    生成上限に達しました
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    問題生成の上限（{userInfo.problem_generation_limit}回）に達しています。
                    管理者に連絡して上限を引き上げてください。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Loading modal (five-stage / three-problems SSE) */}
      <LoadingModal
        isOpen={
          isGenerating &&
          (generationMode === "fiveStage" || generationMode === "threeProblems")
        }
        stage={sseStage}
        totalStages={sseTotalStages}
        stageMessage={stageMessage}
        isDemo={isDemo}
      />

      {/* Preview modal */}
      <ProblemPreviewModal
        problem={previewProblem}
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
        solution={previewSolution}
      />
    </>
  );
}
