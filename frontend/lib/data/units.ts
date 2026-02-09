export interface UnitItem {
  id: string;
  label: string;
  children?: UnitItem[];
}

export const UNITS_HIERARCHY: UnitItem[] = [
  {
    id: "grade1", label: "中学1年",
    children: [
      { id: "g1_function", label: "関数", children: [
        { id: "g1_proportional", label: "比例" },
        { id: "g1_inverse", label: "反比例" },
      ]},
      { id: "g1_geometry", label: "図形", children: [
        { id: "g1_plane", label: "平面図形", children: [
          { id: "g1_line_angle", label: "直線と角" },
          { id: "g1_movement", label: "図形の移動" },
          { id: "g1_circle", label: "円とおうぎ形" },
          { id: "g1_sector", label: "おうぎ形の計量" },
        ]},
        { id: "g1_space", label: "空間図形", children: [
          { id: "g1_position", label: "位置関係" },
          { id: "g1_surface_area", label: "表面積" },
          { id: "g1_volume", label: "体積" },
        ]},
      ]},
      { id: "g1_data", label: "データの活用", children: [
        { id: "g1_frequency", label: "度数分布" },
        { id: "g1_representative", label: "代表値" },
        { id: "g1_significant", label: "有効数字" },
      ]},
    ],
  },
  {
    id: "grade2", label: "中学2年",
    children: [
      { id: "g2_simultaneous", label: "連立方程式" },
      { id: "g2_linear_function", label: "一次関数" },
      { id: "g2_congruent", label: "合同な図形" },
      { id: "g2_probability", label: "確率" },
    ],
  },
  {
    id: "grade3", label: "中学3年",
    children: [
      { id: "g3_expression", label: "式の計算" },
      { id: "g3_sqrt", label: "平方根" },
      { id: "g3_quadratic_eq", label: "二次方程式" },
      { id: "g3_quadratic_func", label: "二次関数" },
      { id: "g3_similar", label: "相似な図形", children: [
        { id: "g3_similar_condition", label: "相似条件" },
        { id: "g3_parallel_ratio", label: "平行線と比" },
        { id: "g3_midpoint", label: "中点連結定理" },
        { id: "g3_area_ratio", label: "面積比" },
        { id: "g3_volume_ratio", label: "体積比" },
      ]},
      { id: "g3_inscribed", label: "円周角" },
      { id: "g3_pythagorean", label: "三平方の定理", children: [
        { id: "g3_pythagorean_basic", label: "三平方の定理の基本" },
        { id: "g3_pythagorean_plane", label: "平面図形への応用" },
        { id: "g3_pythagorean_space", label: "空間図形への応用" },
      ]},
      { id: "g3_data", label: "データの活用", children: [
        { id: "g3_sample", label: "標本調査" },
        { id: "g3_sampling", label: "標本の抽出" },
        { id: "g3_estimation", label: "母集団の推定" },
      ]},
    ],
  },
];

export function getAllUnitsFlat(items: UnitItem[] = UNITS_HIERARCHY): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const item of items) {
    if (!item.children || item.children.length === 0) {
      result.push({ id: item.id, label: item.label });
    } else {
      result.push(...getAllUnitsFlat(item.children));
    }
  }
  return result;
}
