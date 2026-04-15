"use client";
import { useState } from "react";
import { Finding } from "@/types";
import { parseMarkdown } from "@/components/ui/MarkdownText";

const BORDER_COLORS = [
  "border-teal-400",
  "border-violet-400",
  "border-orange-400",
];

const CONFIDENCE_STYLES: Record<string, string> = {
  High:   "bg-green-50 text-green-700",
  Medium: "bg-amber-50 text-amber-700",
  Low:    "bg-gray-100 text-gray-500",
};

// Body is "long" if it has more than 5 non-empty lines or > 500 chars
function isLong(text: string): boolean {
  const nonEmpty = text.split("\n").filter((l) => l.trim().length > 0);
  return text.length > 500 || nonEmpty.length > 5;
}

export default function FindingCard({
  finding,
  index,
}: {
  finding: Finding;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = isLong(finding.body);
  const borderColor = BORDER_COLORS[index % 3];
  const confidenceStyle =
    CONFIDENCE_STYLES[finding.confidence] ?? CONFIDENCE_STYLES.Medium;

  return (
    <div
      className={`bg-white rounded-xl p-4 border-l-4 shadow-sm mb-3 ${borderColor}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">
          {finding.title}
        </p>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${confidenceStyle}`}
        >
          {finding.confidence}
        </span>
      </div>

      {/* Body — clamped when collapsed, full when expanded */}
      <div
        className={`text-xs text-gray-600 leading-relaxed overflow-hidden transition-all duration-300 ${
          !expanded && long ? "max-h-36" : "max-h-[9999px]"
        }`}
      >
        <div>{parseMarkdown(finding.body, true)}</div>
      </div>

      {/* Expand / collapse toggle */}
      {long && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="mt-1.5 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}
    </div>
  );
}
