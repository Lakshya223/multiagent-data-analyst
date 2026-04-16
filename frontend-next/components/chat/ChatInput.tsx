"use client";
import { useState, KeyboardEvent, useRef, useEffect, useLayoutEffect } from "react";
import { AppStatus } from "@/types";

const MODELS = [
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    tag: "Fast",
    tagColor: "text-emerald-600 bg-emerald-50",
    desc: "Quick answers, ideal for most questions",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tag: "Deep thinking",
    tagColor: "text-violet-600 bg-violet-50",
    desc: "Complex analysis and deeper reasoning",
  },
] as const;

export default function ChatInput({
  onSend,
  status,
  model,
  onModelChange,
}: {
  onSend: (q: string) => void;
  status: AppStatus;
  model: string;
  onModelChange: (m: string) => void;
}) {
  const [value, setValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isLoading = status.state === "processing";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Auto-grow textarea
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
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
      <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your retail data..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none resize-none overflow-hidden leading-relaxed disabled:opacity-50 py-0"
          style={{ maxHeight: "9rem" }}
        />

        {/* Model dropdown */}
        <div ref={dropdownRef} className="relative shrink-0">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              {/* Gemini sparkle icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 2C12 2 13.5 8.5 18 10C13.5 11.5 12 18 12 18C12 18 10.5 11.5 6 10C10.5 8.5 12 2 12 2Z" fill="currentColor" opacity="0.8"/>
                <path d="M19 2C19 2 19.75 5.25 22 6C19.75 6.75 19 10 19 10C19 10 18.25 6.75 16 6C18.25 5.25 19 2 19 2Z" fill="currentColor" opacity="0.5"/>
              </svg>
              {activeModel.label}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown menu — opens upward */}
            {dropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Model
                </p>
                {MODELS.map((m) => {
                  const active = model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setDropdownOpen(false); }}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Check mark */}
                      <span className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center">
                        {active && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-800">{m.label}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.tagColor}`}>
                            {m.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
                <div className="h-1.5" />
              </div>
            )}
          </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
      <p className="text-[11px] text-gray-300 mt-1 pl-1">Shift + Enter for new line</p>
    </div>
  );
}
