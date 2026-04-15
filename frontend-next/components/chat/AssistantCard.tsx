import { ChatMessage } from "@/types";
import MarkdownText from "@/components/ui/MarkdownText";

const AGENT_BADGE: Record<string, { label: string; className: string }> = {
  hypothesis: { label: "Hypothesis", className: "bg-amber-100 text-amber-700" },
  sql:        { label: "SQL",         className: "bg-blue-100 text-blue-700" },
  eda:        { label: "Analysis",    className: "bg-violet-100 text-violet-700" },
};

export default function AssistantCard({ message }: { message: ChatMessage }) {
  const badge = message.agentType ? AGENT_BADGE[message.agentType] : null;

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[90%]">
        {badge && (
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
        <MarkdownText text={message.content} />
      </div>
    </div>
  );
}
