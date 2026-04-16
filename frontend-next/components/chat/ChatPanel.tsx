"use client";
import { useState, useCallback } from "react";
import { ChatMessage, AppStatus } from "@/types";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import SuggestionChips from "./SuggestionChips";
import ChatInput from "./ChatInput";

export default function ChatPanel({
  messages,
  status,
  onSend,
  onSelectResult,
  resultIds,
  selectedId,
}: {
  messages: ChatMessage[];
  status: AppStatus;
  onSend: (q: string, model: string) => void;
  onSelectResult?: (id: string) => void;
  resultIds?: Set<string>;
  selectedId?: string | null;
}) {
  const [model, setModel] = useState("gemini-2.0-flash");

  // Wrap so child components only need to pass the question
  const handleSend = useCallback(
    (q: string) => onSend(q, model),
    [onSend, model]
  );

  return (
    <div className="w-full flex flex-col h-full bg-white">
      <ChatHeader />
      <MessageList
        messages={messages}
        status={status}
        onSelect={handleSend}
        onSelectResult={onSelectResult}
        resultIds={resultIds}
        selectedId={selectedId}
      />
      {messages.length > 0 && (
        <SuggestionChips onSelect={handleSend} disabled={status.state === "processing"} />
      )}
      <ChatInput
        onSend={handleSend}
        status={status}
        model={model}
        onModelChange={setModel}
      />
    </div>
  );
}
