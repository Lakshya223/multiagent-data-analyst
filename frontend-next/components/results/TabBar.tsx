"use client";

type Tab = "findings" | "analysis" | "data";

export default function TabBar({
  active,
  onChange,
  onReset,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  onReset?: () => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "findings", label: "Findings" },
    { id: "analysis", label: "Analysis" },
    { id: "data", label: "Data" },
  ];

  return (
    <div className="flex items-center border-b border-gray-200 px-6 shrink-0" data-tour="tab-bar">
      <div className="flex flex-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`mr-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              active === t.id
                ? "border-blue-500 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
          title="Clear results and start a new session"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          New Session
        </button>
      )}
    </div>
  );
}
