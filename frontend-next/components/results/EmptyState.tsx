"use client";
import { SUGGESTIONS } from "@/types";

export default function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D1D5DB"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-400">
          Ask a question to begin your analysis
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
