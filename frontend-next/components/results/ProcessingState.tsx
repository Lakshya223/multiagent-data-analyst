"use client";
import { AGENT_LABELS } from "@/types";

export default function ProcessingState({ agent }: { agent?: string }) {
  const label = agent ? (AGENT_LABELS[agent] ?? agent) : "Analyzing";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      {/* Orbiting magnifier */}
      <div className="relative w-24 h-24">
        {/* Dashed orbit track */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-100" />

        {/* Orbiting dot with magnifier icon */}
        <div className="orbit-dot">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {/* Center pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-600">{label} is working</p>
        <p className="text-xs text-gray-400 mt-1">Analyzing your retail data…</p>
      </div>
    </div>
  );
}
