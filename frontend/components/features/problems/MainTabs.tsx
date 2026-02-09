"use client";

interface MainTabsProps {
  activeTab: "list" | "generate";
  onTabChange: (tab: "list" | "generate") => void;
}

const TABS: { key: "list" | "generate"; label: string }[] = [
  { key: "list", label: "問題一覧" },
  { key: "generate", label: "問題生成" },
];

export default function MainTabs({ activeTab, onTabChange }: MainTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`relative px-6 py-3 text-sm transition-colors ${
              isActive
                ? "font-bold text-gray-900"
                : "font-medium text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-mongene-green rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
