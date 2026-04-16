import { Finding } from "@/types";
import FindingCard from "./FindingCard";
import MarkdownText from "@/components/ui/MarkdownText";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="mt-6 mb-3 first:mt-0">
      <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
      <hr className="border-gray-300" />
    </div>
  );
}

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

  const hypotheses = findings.filter((f) => f.section === "hypothesis");
  const recommendations = findings.filter((f) => f.section === "recommendation");
  // Findings without a section (e.g. from older sessions) — render ungrouped
  const ungrouped = findings.filter((f) => !f.section || f.section === "other");

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-6">
      {/* Summary */}
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

      {/* Hypotheses */}
      {hypotheses.length > 0 && (
        <>
          <SectionHeading label="Hypotheses" />
          {hypotheses.map((f, i) => (
            <FindingCard key={`h-${i}`} finding={f} index={i} />
          ))}
        </>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <>
          <SectionHeading label="Recommendations" />
          {recommendations.map((f, i) => (
            <FindingCard key={`r-${i}`} finding={f} index={i} />
          ))}
        </>
      )}

      {/* Ungrouped (backward compat) */}
      {ungrouped.length > 0 && (
        <>
          {(hypotheses.length > 0 || recommendations.length > 0) && (
            <SectionHeading label="Other" />
          )}
          {ungrouped.map((f, i) => (
            <FindingCard key={`u-${i}`} finding={f} index={i} />
          ))}
        </>
      )}
    </div>
  );
}
