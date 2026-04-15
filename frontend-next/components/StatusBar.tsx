"use client";
import { AppStatus } from "@/types";

const AGENT_DISPLAY: Record<string, string> = {
  sql_agent: "SQL Agent",
  eda_agent: "EDA Agent",
  hypothesis_agent: "Hypothesis Agent",
  fallback: "Fallback Agent",
};

export default function StatusBar({ status }: { status: AppStatus }) {
  const isProcessing = status.state === "processing";
  const label =
    isProcessing
      ? `Processing: ${AGENT_DISPLAY[status.agent] ?? status.agent}`
      : "Idle";

  return (
    <div className="flex items-center gap-2 px-4 h-8 bg-white border-b border-gray-200 shrink-0">
      <span
        className={`w-2 h-2 rounded-full ${
          isProcessing ? "bg-green-500 animate-pulse" : "bg-gray-400"
        }`}
      />
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}
