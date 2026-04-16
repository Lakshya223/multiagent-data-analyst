import { Finding } from "@/types";
import FindingCard from "./FindingCard";
import MarkdownText from "@/components/ui/MarkdownText";

export default function FindingsTab({
  findings,
  summary,
}: {
  findings: Finding[];
  summary?: string;
}) {
  if (findings.length === 0 && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No findings yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-6">
      {/* Summary section */}
      {summary && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-7 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-3">
            Summary
          </p>
          <div className="text-sm text-gray-700 leading-relaxed">
            <MarkdownText text={summary} />
          </div>
        </div>
      )}

      {/* Individual finding cards */}
      {findings.map((f, i) => (
        <FindingCard key={i} finding={f} index={i} />
      ))}
    </div>
  );
}
