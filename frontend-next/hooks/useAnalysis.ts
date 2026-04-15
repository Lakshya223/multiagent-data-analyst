"use client";
import { useState, useCallback } from "react";
import { ChatMessage, AnalysisResult, AppStatus, ResultEntry } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useAnalysis() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resultHistory, setResultHistory] = useState<ResultEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>({ state: "idle" });

  // Derived: the currently-displayed result
  const currentResult = resultHistory.find((e) => e.id === selectedId)?.result ?? null;

  // Set of message IDs that have a corresponding result (for UserBubble click targets)
  const resultIds = new Set(resultHistory.map((e) => e.id));

  const selectResult = useCallback((id: string) => setSelectedId(id), []);

  const analyze = useCallback(async (question: string) => {
    const questionId = randomId();

    // Add user message — id matches questionId so we can link result to bubble
    const userMsg: ChatMessage = {
      id: questionId,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus({ state: "processing", agent: "supervisor" });
    // NOTE: intentionally NOT clearing the result — old result stays visible while processing

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { streamDone = true; break; }

          let event: Record<string, unknown> | null = null;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }
          if (!event) continue;

          if (event.type === "agent_start") {
            setStatus({ state: "processing", agent: event.agent as string });
          }

          if (event.type === "result") {
            const analysisResult: AnalysisResult = {
              sessionId: event.session_id as string,
              findings: (event.findings as AnalysisResult["findings"]) ?? [],
              summary: (event.summary as string) ?? "",
              chartUrls: (event.chart_urls as string[]) ?? [],
              chartInferences: (event.chart_inferences as string[]) ?? [],
              sqlQuery: (event.sql_query as string | null) ?? null,
              sqlQueries: (event.sql_queries as string[]) ?? [],
              sqlResults: ((event.sql_results as Array<{query: string; table_data: {columns: string[]; rows: Record<string, unknown>[]} | null}>) ?? []).map((r) => ({
                query: r.query ?? "",
                tableData: r.table_data ?? null,
              })),
              answer: (event.answer as string) ?? "",
              edaInferences: (event.eda_inferences as string[]) ?? [],
            };

            // Store in history and select it
            setResultHistory((prev) => [...prev, { id: questionId, result: analysisResult }]);
            setSelectedId(questionId);

            const assistantMsg: ChatMessage = {
              id: randomId(),
              role: "assistant",
              content: (event.answer as string) || "Analysis complete. See the results panel.",
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStatus({ state: "idle" });
          }

          if (event.type === "error") {
            throw new Error(event.message as string);
          }
        }
      }
      setStatus({ state: "idle" });
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: randomId(),
        role: "assistant",
        content: `Something went wrong: ${err instanceof Error ? err.message : "unknown error"}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setStatus({ state: "idle" });
    }
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setResultHistory([]);
    setSelectedId(null);
    setStatus({ state: "idle" });
  }, []);

  return { messages, currentResult, status, analyze, reset, selectResult, resultIds, selectedId };
}
