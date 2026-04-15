"use client";
import { useEffect, useRef } from "react";
import { ChatMessage, AppStatus } from "@/types";
import UserBubble from "./UserBubble";
import AssistantCard from "./AssistantCard";
import ThinkingBubble from "./ThinkingBubble";

function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D1D5DB"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <p className="text-sm text-gray-400">
        Start a conversation to analyze your retail data
      </p>
    </div>
  );
}

export default function MessageList({
  messages,
  status,
  onSelect,
  onSelectResult,
  resultIds,
  selectedId,
}: {
  messages: ChatMessage[];
  status: AppStatus;
  onSelect: (q: string) => void;
  onSelectResult?: (id: string) => void;
  resultIds?: Set<string>;
  selectedId?: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0) {
    return <ChatEmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll px-4 pt-4 pb-2">
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserBubble
            key={msg.id}
            content={msg.content}
            onClick={resultIds?.has(msg.id) ? () => onSelectResult?.(msg.id) : undefined}
            isActive={msg.id === selectedId}
          />
        ) : (
          <AssistantCard key={msg.id} message={msg} />
        )
      )}

      {/* Thinking animation shown while processing */}
      {status.state === "processing" && (
        <ThinkingBubble agent={status.agent} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
