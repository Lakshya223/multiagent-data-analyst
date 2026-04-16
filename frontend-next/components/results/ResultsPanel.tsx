"use client";
import { useState } from "react";
import { AnalysisResult, AppStatus, AGENT_LABELS, ResultEntry, ChatMessage } from "@/types";
import TabBar from "./TabBar";
import FindingsTab from "./FindingsTab";
import AnalysisTab from "./AnalysisTab";
import DataTab from "./DataTab";
import EmptyState from "./EmptyState";
import ProcessingState from "./ProcessingState";

type Tab = "findings" | "analysis" | "data";

export default function ResultsPanel({
  result,
  status,
  onSelect,
  onReset,
  resultHistory,
  messages,
}: {
  result: AnalysisResult | null;
  status: AppStatus;
  onSelect: (q: string) => void;
  onReset?: () => void;
  resultHistory?: ResultEntry[];
  messages?: ChatMessage[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("findings");
  const isProcessing = status.state === "processing";

  if (!result) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white">
        <TabBar active={activeTab} onChange={setActiveTab} resultHistory={resultHistory} messages={messages} />
        {isProcessing ? (
          <ProcessingState agent={status.agent} />
        ) : (
          <EmptyState onSelect={onSelect} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <TabBar active={activeTab} onChange={setActiveTab} onReset={onReset} resultHistory={resultHistory} messages={messages} />

      {/* Thin pulsing banner shown while a new query is processing */}
      {isProcessing && (
        <div className="shrink-0 flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-600">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          {AGENT_LABELS[status.agent] ?? "Agent"} is analyzing…
        </div>
      )}

      {activeTab === "findings" && <FindingsTab findings={result.findings} summary={result.summary} />}
      {activeTab === "analysis" && (
        <AnalysisTab
          chartUrls={result.chartUrls}
          chartInferences={result.chartInferences}
          edaInferences={result.edaInferences}
        />
      )}
      {activeTab === "data" && (
        <DataTab sqlResults={result.sqlResults} />
      )}
    </div>
  );
}
