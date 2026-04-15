"use client";
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
  onSend: (q: string) => void;
  onSelectResult?: (id: string) => void;
  resultIds?: Set<string>;
  selectedId?: string | null;
}) {
  return (
    <div className="w-full flex flex-col h-full bg-white">
      <ChatHeader />
      <MessageList
        messages={messages}
        status={status}
        onSelect={onSend}
        onSelectResult={onSelectResult}
        resultIds={resultIds}
        selectedId={selectedId}
      />
      {messages.length > 0 && (
        <SuggestionChips onSelect={onSend} disabled={status.state === "processing"} />
      )}
      <ChatInput onSend={onSend} status={status} />
    </div>
  );
}
