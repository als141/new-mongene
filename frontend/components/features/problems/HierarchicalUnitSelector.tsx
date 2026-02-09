"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UnitItem } from "@/lib/data/units";

interface HierarchicalUnitSelectorProps {
  items: UnitItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** Collect all leaf IDs below a node (inclusive if it has no children). */
function collectLeafIds(node: UnitItem): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  return node.children.flatMap(collectLeafIds);
}

/** Collect every ID in the subtree (including the node itself). */
function collectAllIds(node: UnitItem): string[] {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectAllIds(child));
    }
  }
  return ids;
}

type CheckState = "checked" | "unchecked" | "indeterminate";

function getCheckState(node: UnitItem, selected: Set<string>): CheckState {
  if (!node.children || node.children.length === 0) {
    return selected.has(node.id) ? "checked" : "unchecked";
  }
  const childStates = node.children.map((c) => getCheckState(c, selected));
  if (childStates.every((s) => s === "checked")) return "checked";
  if (childStates.every((s) => s === "unchecked")) return "unchecked";
  return "indeterminate";
}

// ---------------------------------------------------------------------------
// TriStateCheckbox
// ---------------------------------------------------------------------------
function TriStateCheckbox({
  state,
  onChange,
}: {
  state: CheckState;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "indeterminate";
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "checked"}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
    />
  );
}

// ---------------------------------------------------------------------------
// TreeNode
// ---------------------------------------------------------------------------
function TreeNode({
  node,
  selectedSet,
  onToggle,
  depth,
}: {
  node: UnitItem;
  selectedSet: Set<string>;
  onToggle: (node: UnitItem) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = !!node.children && node.children.length > 0;
  const state = getCheckState(node, selectedSet);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {/* Expand / collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Checkbox */}
        <TriStateCheckbox state={state} onChange={() => onToggle(node)} />

        {/* Label */}
        <span
          className={`select-none cursor-pointer ${
            hasChildren
              ? "text-sm font-medium text-gray-800"
              : "text-sm text-gray-600"
          }`}
          onClick={() => onToggle(node)}
        >
          {node.label}
        </span>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedSet={selectedSet}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HierarchicalUnitSelector
// ---------------------------------------------------------------------------
export default function HierarchicalUnitSelector({
  items,
  selectedIds,
  onChange,
}: HierarchicalUnitSelectorProps) {
  const selectedSet = new Set(selectedIds);

  const handleToggle = useCallback(
    (node: UnitItem) => {
      const allIds = collectAllIds(node);
      const state = getCheckState(node, new Set(selectedIds));

      let next: string[];
      if (state === "checked") {
        // Deselect all ids in this subtree
        const removeSet = new Set(allIds);
        next = selectedIds.filter((id) => !removeSet.has(id));
      } else {
        // Select all ids in this subtree
        const addSet = new Set(allIds);
        next = [...selectedIds.filter((id) => !addSet.has(id)), ...allIds];
      }
      onChange(next);
    },
    [selectedIds, onChange],
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 max-h-80 overflow-y-auto">
      {items.map((item) => (
        <TreeNode
          key={item.id}
          node={item}
          selectedSet={selectedSet}
          onToggle={handleToggle}
          depth={0}
        />
      ))}
    </div>
  );
}
