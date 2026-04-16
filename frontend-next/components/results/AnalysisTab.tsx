"use client";

export default function AnalysisTab({
  chartUrls,
  chartInferences,
  edaInferences,
}: {
  chartUrls: string[];
  chartInferences: string[];
  edaInferences?: string[];
}) {
  if (chartUrls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No analysis yet.</p>
      </div>
    );
  }

  // Merge all round narratives into one overall insight — users don't need
  // to know analysis happened in multiple rounds.
  const overallInsight =
    edaInferences && edaInferences.length > 0
      ? edaInferences.join(" ")
      : null;

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-6 space-y-6">
      {/* Overall insight — shown at the top */}
      {overallInsight && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-2">
            Overall Analysis
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{overallInsight}</p>
        </div>
      )}

      {/* Per-chart cards */}
      {chartUrls.map((url, i) => {
        const inference = chartInferences[i] ?? "";
        return (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className={`flex gap-0 ${inference ? "flex-col md:flex-row" : ""}`}>
              {/* Chart image */}
              <div className={inference ? "md:flex-1" : "w-full"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${url}`}
                  alt={`Analysis chart ${i + 1}`}
                  className="w-full object-contain"
                />
              </div>

              {/* Per-chart insight */}
              {inference && (
                <div className="md:w-72 shrink-0 p-5 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    Chart Insight
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{inference}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

    </div>
  );
}
