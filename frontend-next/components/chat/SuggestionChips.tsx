"use client";
import { SUGGESTIONS } from "@/types";

export default function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3 w-full">
      {SUGGESTIONS.slice(0, 3).map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="shrink-0 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
