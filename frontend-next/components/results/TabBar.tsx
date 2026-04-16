"use client";
import { useState } from "react";
import SchemaModal from "@/components/ui/SchemaModal";
import ReportModal from "@/components/ui/ReportModal";
import { ResultEntry, ChatMessage } from "@/types";

type Tab = "findings" | "analysis" | "data";

export default function TabBar({
  active,
  onChange,
  onReset,
  resultHistory,
  messages,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  onReset?: () => void;
  resultHistory?: ResultEntry[];
  messages?: ChatMessage[];
}) {
  const [showSchema, setShowSchema] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const hasResults = (resultHistory?.length ?? 0) > 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "findings", label: "Findings" },
    { id: "analysis", label: "Analysis" },
    { id: "data", label: "Data" },
  ];

  return (
    <>
      <div className="flex items-center border-b border-gray-200 px-6 shrink-0" data-tour="tab-bar">
        {/* Tabs */}
        <div className="flex flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`mr-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
                active === t.id
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right — Schema + Report + New Session */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSchema(true)}
            data-tour="schema-button"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
            title="View database schema"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            Schema
          </button>

          {hasResults && (
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-colors"
              title="Generate session report"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Report
            </button>
          )}

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
      </div>

      {showSchema && <SchemaModal onClose={() => setShowSchema(false)} />}
      {showReport && resultHistory && messages && (
        <ReportModal
          onClose={() => setShowReport(false)}
          resultHistory={resultHistory}
          messages={messages}
        />
      )}
    </>
  );
}
