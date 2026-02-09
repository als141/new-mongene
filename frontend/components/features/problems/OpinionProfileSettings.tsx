"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface OpinionProfileV2 {
  problem_text_length: number;
  sub_problem_text_length: number;
  given_values_count: number;
  sub_problem_count: number;
  sub_problem_types: string[];
  solid_composition: string;
  answer_formats: string[];
  answer_units: string[];
  uses_auxiliary_points: boolean;
  setup_units: string[];
  solution_units: string[];
  total_vertices: number;
  has_moving_point: boolean;
  figure_values_count: number;
  solution_steps: number;
  has_logical_branching: boolean;
  theorem_count: number;
  requires_multi_unit_integration: boolean;
  has_irrelevant_info: boolean;
}

interface OpinionProfileSettingsProps {
  opinionProfile: OpinionProfileV2;
  onOpinionProfileChange: (profile: OpinionProfileV2) => void;
}

function AccordionItem({
  title,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-mongene-border rounded-lg mb-3 overflow-hidden">
      <button
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-mongene-ink text-sm">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-mongene-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-white">{children}</div>
      )}
    </div>
  );
}

function ToggleChip({
  label,
  selected,
  onClick,
  color = "blue",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: selected
      ? "bg-mongene-blue text-white"
      : "bg-gray-100 text-mongene-ink hover:bg-gray-200",
    green: selected
      ? "bg-mongene-green text-white"
      : "bg-gray-100 text-mongene-ink hover:bg-gray-200",
    purple: selected
      ? "bg-purple-500 text-white"
      : "bg-gray-100 text-mongene-ink hover:bg-gray-200",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium text-mongene-ink mb-2">
        <span>{label}</span>
        <span className="text-mongene-blue font-bold tabular-nums">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-mongene-blue"
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-mongene-blue"
      />
      <span className="text-sm text-mongene-ink">{label}</span>
    </label>
  );
}

export default function OpinionProfileSettings({
  opinionProfile,
  onOpinionProfileChange,
}: OpinionProfileSettingsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    detailSettings: false,
    textComposition: true,
    answerFormat: false,
    units: false,
    geometry: false,
    solutionProcess: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateProfile = (updates: Partial<OpinionProfileV2>) => {
    onOpinionProfileChange({ ...opinionProfile, ...updates });
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  const applyNiigataPreset = () => {
    onOpinionProfileChange({
      problem_text_length: 122,
      sub_problem_text_length: 108,
      given_values_count: 3,
      sub_problem_count: 4,
      sub_problem_types: ["長さを求める", "面積を求める", "体積を求める"],
      solid_composition: "単一の立体",
      answer_formats: ["整数", "既約分数"],
      answer_units: ["cm", "cm\u00B2", "cm\u00B3"],
      uses_auxiliary_points: true,
      setup_units: ["直方体", "平行"],
      solution_units: [
        "三平方の定理",
        "相似",
        "面積の公式",
        "体積の公式",
        "平行と比",
        "相似比",
        "体積比",
        "展開図",
        "補助線",
      ],
      total_vertices: 11,
      has_moving_point: true,
      figure_values_count: 3,
      solution_steps: 11,
      has_logical_branching: false,
      theorem_count: 4,
      requires_multi_unit_integration: true,
      has_irrelevant_info: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-mongene-ink mb-1">設定項目</h3>
        <p className="text-xs text-mongene-muted">
          空間図形問題の詳細な特性を定量的に設定します。
        </p>
      </div>

      {/* プリセット */}
      <div className="p-4 bg-mongene-blue/5 border border-mongene-blue/20 rounded-lg">
        <h4 className="text-sm font-semibold text-mongene-ink mb-3">
          プリセット設定
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={applyNiigataPreset}
            className="px-4 py-2 bg-mongene-blue text-white rounded-lg hover:bg-mongene-blue/90 transition-colors text-sm font-medium"
          >
            新潟県（2024年）
          </button>
        </div>
        <p className="text-xs text-mongene-muted mt-2">
          プリセットを選択すると、該当する公立高校入試の評価指標に基づいた設定が適用されます
        </p>
      </div>

      {/* 詳細設定 */}
      <AccordionItem
        title="詳細設定"
        isOpen={openSections.detailSettings}
        onToggle={() => toggleSection("detailSettings")}
      >
        <div className="space-y-3">
          <p className="text-xs text-mongene-muted mb-4">
            より詳細な条件を設定したい場合は、以下の項目を調整してください。
          </p>

          {/* 1. 文章量・構成 */}
          <AccordionItem
            title="1. 文章量・構成に関する指標"
            isOpen={openSections.textComposition}
            onToggle={() => toggleSection("textComposition")}
          >
            <div className="space-y-4">
              <SliderField
                label="大問の問題文文字数"
                value={opinionProfile.problem_text_length}
                min={0}
                max={500}
                step={10}
                onChange={(v) => updateProfile({ problem_text_length: v })}
              />
              <SliderField
                label="小問の総文字数"
                value={opinionProfile.sub_problem_text_length}
                min={0}
                max={300}
                step={10}
                onChange={(v) => updateProfile({ sub_problem_text_length: v })}
              />
              <SliderField
                label="与えられる数値の個数"
                value={opinionProfile.given_values_count}
                min={0}
                max={10}
                onChange={(v) => updateProfile({ given_values_count: v })}
              />
              <SliderField
                label="小問の数"
                value={opinionProfile.sub_problem_count}
                min={1}
                max={5}
                onChange={(v) => updateProfile({ sub_problem_count: v })}
              />

              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  小問ごとの要求種別
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "長さを求める",
                    "面積を求める",
                    "体積を求める",
                    "最短距離を求める",
                    "角度を求める",
                    "比を求める",
                  ].map((type) => (
                    <ToggleChip
                      key={type}
                      label={type}
                      selected={opinionProfile.sub_problem_types.includes(type)}
                      onClick={() =>
                        updateProfile({
                          sub_problem_types: toggleArrayItem(
                            opinionProfile.sub_problem_types,
                            type
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  立体の構成
                </label>
                <select
                  value={opinionProfile.solid_composition}
                  onChange={(e) =>
                    updateProfile({ solid_composition: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-mongene-border rounded-lg text-sm bg-white"
                >
                  <option value="">選択してください</option>
                  <option value="単一の立体">単一の立体</option>
                  <option value="複数の立体の組み合わせ">
                    複数の立体の組み合わせ
                  </option>
                </select>
              </div>
            </div>
          </AccordionItem>

          {/* 2. 解答形式 */}
          <AccordionItem
            title="2. 解答形式に関する指標"
            isOpen={openSections.answerFormat}
            onToggle={() => toggleSection("answerFormat")}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  解答の形式
                </label>
                <div className="flex flex-wrap gap-2">
                  {["整数", "既約分数", "無理数(\u221A)"].map((format) => (
                    <ToggleChip
                      key={format}
                      label={format}
                      selected={opinionProfile.answer_formats.includes(format)}
                      onClick={() =>
                        updateProfile({
                          answer_formats: toggleArrayItem(
                            opinionProfile.answer_formats,
                            format
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  小問ごとの要求単位
                </label>
                <div className="flex flex-wrap gap-2">
                  {["cm", "cm\u00B2", "cm\u00B3", "度", "単位なし"].map(
                    (unit) => (
                      <ToggleChip
                        key={unit}
                        label={unit}
                        selected={opinionProfile.answer_units.includes(unit)}
                        onClick={() =>
                          updateProfile({
                            answer_units: toggleArrayItem(
                              opinionProfile.answer_units,
                              unit
                            ),
                          })
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <CheckboxField
                label="正答例での補助点の使用"
                checked={opinionProfile.uses_auxiliary_points}
                onChange={(v) => updateProfile({ uses_auxiliary_points: v })}
              />
            </div>
          </AccordionItem>

          {/* 3. 使用単元 */}
          <AccordionItem
            title="3. 使用単元に関する指標"
            isOpen={openSections.units}
            onToggle={() => toggleSection("units")}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  単元（設定）
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "正方形",
                    "長方形",
                    "正三角形",
                    "二等辺三角形",
                    "直角三角形",
                    "台形",
                    "円",
                    "直方体",
                    "立方体",
                    "正四角すい",
                    "三角すい",
                    "円すい",
                    "三角柱",
                    "円柱",
                    "平行",
                    "垂直・垂線",
                    "中点",
                    "交点",
                    "平面",
                  ].map((unit) => (
                    <ToggleChip
                      key={unit}
                      label={unit}
                      selected={opinionProfile.setup_units.includes(unit)}
                      color="green"
                      onClick={() =>
                        updateProfile({
                          setup_units: toggleArrayItem(
                            opinionProfile.setup_units,
                            unit
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-mongene-ink mb-2">
                  単元（解法）
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "三平方の定理",
                    "相似",
                    "中点連結定理",
                    "円周角の定理",
                    "面積の公式",
                    "体積の公式",
                    "平行と比",
                    "相似比",
                    "面積比",
                    "体積比",
                    "二等辺三角形の性質",
                    "正三角形の性質",
                    "展開図",
                    "補助線",
                  ].map((unit) => (
                    <ToggleChip
                      key={unit}
                      label={unit}
                      selected={opinionProfile.solution_units.includes(unit)}
                      color="purple"
                      onClick={() =>
                        updateProfile({
                          solution_units: toggleArrayItem(
                            opinionProfile.solution_units,
                            unit
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </AccordionItem>

          {/* 4. 図形 */}
          <AccordionItem
            title="4. 図形に関する指標"
            isOpen={openSections.geometry}
            onToggle={() => toggleSection("geometry")}
          >
            <div className="space-y-4">
              <SliderField
                label="総頂点・点の数"
                value={opinionProfile.total_vertices}
                min={0}
                max={20}
                onChange={(v) => updateProfile({ total_vertices: v })}
              />
              <CheckboxField
                label="動点の有無"
                checked={opinionProfile.has_moving_point}
                onChange={(v) => updateProfile({ has_moving_point: v })}
              />
              <SliderField
                label="図中に明記された数値の個数"
                value={opinionProfile.figure_values_count}
                min={0}
                max={15}
                onChange={(v) => updateProfile({ figure_values_count: v })}
              />
            </div>
          </AccordionItem>

          {/* 5. 解法プロセス */}
          <AccordionItem
            title="5. 解法プロセスと認知負荷に関する指標"
            isOpen={openSections.solutionProcess}
            onToggle={() => toggleSection("solutionProcess")}
          >
            <div className="space-y-4">
              <SliderField
                label="解法のステップ数"
                value={opinionProfile.solution_steps}
                min={1}
                max={20}
                onChange={(v) => updateProfile({ solution_steps: v })}
              />
              <CheckboxField
                label="論理的分岐の有無（場合分け）"
                checked={opinionProfile.has_logical_branching}
                onChange={(v) => updateProfile({ has_logical_branching: v })}
              />
              <SliderField
                label="使用定理・公式の数"
                value={opinionProfile.theorem_count}
                min={0}
                max={8}
                onChange={(v) => updateProfile({ theorem_count: v })}
              />
              <CheckboxField
                label="複数単元の知識統合の要否"
                checked={opinionProfile.requires_multi_unit_integration}
                onChange={(v) =>
                  updateProfile({ requires_multi_unit_integration: v })
                }
              />
              <CheckboxField
                label="無関係な情報の有無（外発的認知負荷）"
                checked={opinionProfile.has_irrelevant_info}
                onChange={(v) => updateProfile({ has_irrelevant_info: v })}
              />
            </div>
          </AccordionItem>
        </div>
      </AccordionItem>
    </div>
  );
}
