"use client";
import { AGENT_LABELS } from "@/types";

export default function ThinkingBubble({ agent }: { agent?: string }) {
  const label = agent ? (AGENT_LABELS[agent] ?? agent) : "Thinking";

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">{label} is working…</p>
      </div>
    </div>
  );
}
