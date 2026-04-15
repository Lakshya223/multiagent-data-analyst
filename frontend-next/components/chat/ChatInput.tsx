"use client";
import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { AppStatus } from "@/types";

export default function ChatInput({
  onSend,
  status,
}: {
  onSend: (q: string) => void;
  status: AppStatus;
}) {
  const [value, setValue] = useState("");
  const isLoading = status.state === "processing";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow: reset height then set to scrollHeight so it expands with content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    // Reset height after clearing
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3" data-tour="chat-input">
      <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your retail data..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none resize-none overflow-hidden leading-relaxed disabled:opacity-50"
          style={{ maxHeight: "9rem" }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          className="w-7 h-7 mb-0.5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-300 mt-1 pl-1">Shift + Enter for new line</p>
    </div>
  );
}
