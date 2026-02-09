"use client";

export interface FilterOption {
  id: string;
  label: string;
  active: boolean;
}

export interface FilterGroup {
  label: string;
  options: FilterOption[];
}

interface FiltersProps {
  groups: FilterGroup[];
  onToggle: (groupIndex: number, optionId: string) => void;
}

export default function Filters({ groups, onToggle }: FiltersProps) {
  return (
    <div className="space-y-3">
      {groups.map((group, groupIdx) => (
        <div key={group.label}>
          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(groupIdx, opt.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  opt.active
                    ? "bg-mongene-blue text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
