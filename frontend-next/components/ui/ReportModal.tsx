"use client";
import { useState } from "react";
import { ResultEntry, ChatMessage, Finding } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReportModalProps {
  onClose: () => void;
  resultHistory: ResultEntry[];
  messages: ChatMessage[];
}

function confidenceStyle(conf: Finding["confidence"]) {
  if (conf === "High")   return { dot: "bg-blue-500",  pill: "bg-blue-50 text-blue-700 border-blue-200" };
  if (conf === "Medium") return { dot: "bg-amber-400", pill: "bg-amber-50 text-amber-700 border-amber-200" };
  return                        { dot: "bg-gray-400",  pill: "bg-gray-50 text-gray-600 border-gray-200" };
}

function sectionLabel(section: Finding["section"]) {
  if (section === "hypothesis")     return "Hypothesis";
  if (section === "recommendation") return "Recommendation";
  return "Finding";
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildHtmlReport(
  resultHistory: ResultEntry[],
  messages: ChatMessage[],
  base64Charts: Record<string, string>,
  dateStr: string
): string {
  const sections = resultHistory.map((entry, i) => {
    const userMsg = messages.find((m) => m.id === entry.id);
    const question = userMsg?.content ?? `Question ${i + 1}`;
    const r = entry.result;

    const findingsHtml = r.findings.map((f) => {
      const cs = confidenceStyle(f.confidence);
      const dotColor = cs.dot.replace("bg-", "background:");
      const label = sectionLabel(f.section);
      return `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <div style="margin-top:5px;width:8px;height:8px;border-radius:50%;flex-shrink:0;${dotColor.includes("blue") ? "background:#3b82f6" : dotColor.includes("amber") ? "background:#f59e0b" : "background:#9ca3af"}"></div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;border:1px solid;${f.confidence === "High" ? "background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe" : f.confidence === "Medium" ? "background:#fffbeb;color:#92400e;border-color:#fde68a" : "background:#f9fafb;color:#4b5563;border-color:#e5e7eb"}">${label} · ${f.confidence}</span>
              <span style="font-size:13px;font-weight:600;color:#111827;">${f.title}</span>
            </div>
            <p style="font-size:13px;color:#4b5563;margin:0;line-height:1.6;">${f.body.replace(/\*\*/g, "").replace(/\*/g, "")}</p>
          </div>
        </div>`;
    }).join("");

    const chartsHtml = r.chartUrls.map((url, ci) => {
      const fullUrl = `${API_BASE}${url}`;
      const src = base64Charts[fullUrl] ?? fullUrl;
      const inference = r.chartInferences[ci] ?? "";
      return `
        <div style="display:flex;gap:16px;margin-bottom:16px;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
          <img src="${src}" alt="Chart ${ci + 1}" style="flex:1;max-width:65%;object-fit:contain;" />
          ${inference ? `<div style="flex:1;padding:16px;background:#f9fafb;display:flex;flex-direction:column;justify-content:center;">
            <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin:0 0 8px 0;">Chart Insight</p>
            <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">${inference}</p>
          </div>` : ""}
        </div>`;
    }).join("");

    const overallInsight = r.edaInferences.join(" ");

    const sqlHtml = r.sqlResults.map((sr, qi) => `
      <div style="margin-bottom:12px;">
        <p style="font-size:11px;font-weight:600;color:#6b7280;margin:0 0 6px 0;">Query ${qi + 1}</p>
        <pre style="background:#1e293b;color:#e2e8f0;border-radius:8px;padding:14px 16px;font-size:12px;overflow-x:auto;margin:0;font-family:'JetBrains Mono',monospace,monospace;">${sr.query.trim()}</pre>
        ${sr.tableData ? `<p style="font-size:11px;color:#9ca3af;margin:4px 0 0 0;">${sr.tableData.rows.length} rows · ${sr.tableData.columns.length} columns</p>` : ""}
      </div>`).join("");

    const borderColors = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
    const borderColor = borderColors[i % borderColors.length];

    return `
      <div data-pdf="section" style="border:1px solid #e5e7eb;border-left:4px solid ${borderColor};border-radius:12px;padding:28px 28px 20px;margin-bottom:28px;background:#fff;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:${borderColor};color:#fff;font-size:12px;font-weight:700;flex-shrink:0;vertical-align:middle;">${i + 1}</span>
          <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0;line-height:28px;">"${question}"</h2>
        </div>

        ${r.summary ? `
        <div style="margin-bottom:20px;">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6366f1;margin:0 0 10px 0;">Summary</p>
          <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px;">
            <p style="font-size:13px;color:#374151;line-height:1.7;margin:0;">${r.summary.replace(/##.*?\n/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n/g, " ").trim()}</p>
          </div>
        </div>` : ""}

        ${r.findings.length > 0 ? `
        <div style="margin-bottom:20px;">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin:0 0 10px 0;">Key Findings (${r.findings.length})</p>
          ${findingsHtml}
        </div>` : ""}

        ${r.chartUrls.length > 0 ? `
        <div style="margin-bottom:20px;">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin:0 0 10px 0;">Charts &amp; Analysis</p>
          ${chartsHtml}
        </div>` : ""}

        ${overallInsight ? `
        <div style="margin-bottom:20px;">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin:0 0 10px 0;">Overall Analysis</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
            <p style="font-size:13px;color:#4b5563;line-height:1.7;margin:0;">${overallInsight}</p>
          </div>
        </div>` : ""}

        ${r.sqlResults.length > 0 ? `
        <div>
          <p style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin:0 0 10px 0;">SQL Queries</p>
          ${sqlHtml}
        </div>` : ""}
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Session Report · ${dateStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #111827; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <!-- Gradient accent bar -->
  <div style="height:4px;background:linear-gradient(to right,#6366f1,#8b5cf6,#10b981);"></div>

  <div style="max-width:900px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div data-pdf="header" style="margin-bottom:40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div>
          <h1 style="font-size:22px;font-weight:700;color:#111827;">Session Report</h1>
          <p style="font-size:13px;color:#6b7280;margin-top:2px;">Generated ${dateStr} · ${resultHistory.length} question${resultHistory.length !== 1 ? "s" : ""} analyzed</p>
        </div>
      </div>
    </div>

    <!-- Q&A sections -->
    ${sections}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;border-top:1px solid #e5e7eb;margin-top:8px;">
      <p style="font-size:12px;color:#9ca3af;">Generated by Lens · Retail Customer Journey Intelligence</p>
    </div>
  </div>
</body>
</html>`;
}

export default function ReportModal({ onClose, resultHistory, messages }: ReportModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    let container: HTMLDivElement | null = null;
    try {
      // Fetch charts as base64 so the off-screen render has no CORS/oklch issues
      const allChartUrls = resultHistory.flatMap((e) =>
        e.result.chartUrls.map((u) => `${API_BASE}${u}`)
      );
      const uniqueUrls = [...new Set(allChartUrls)];
      const base64Map: Record<string, string> = {};
      await Promise.all(
        uniqueUrls.map(async (url) => {
          try { base64Map[url] = await fetchAsBase64(url); } catch { /* fall back to URL */ }
        })
      );

      // Build the same inline-style HTML used for the HTML download (no Tailwind = no oklch)
      const html = buildHtmlReport(resultHistory, messages, base64Map, dateStr);

      // Parse and mount in a hidden off-screen div so html2canvas can render it
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      container = document.createElement("div");
      container.style.cssText =
        "position:absolute;left:-9999px;top:0;width:960px;background:#f8fafc;";
      container.innerHTML = doc.body.innerHTML;
      document.body.appendChild(container);

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const captureOpts = {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      };

      // Capture each logical block separately so page breaks never cut through a chart
      const headerEl = container.querySelector("[data-pdf='header']") as HTMLElement | null;
      const sectionEls = Array.from(
        container.querySelectorAll("[data-pdf='section']")
      ) as HTMLElement[];

      const canvases: HTMLCanvasElement[] = [];
      if (headerEl) canvases.push(await html2canvas(headerEl, captureOpts));
      for (const el of sectionEls) canvases.push(await html2canvas(el, captureOpts));

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pdfW - margin * 2;
      let curY = margin;

      for (const cvs of canvases) {
        const imgData = cvs.toDataURL("image/png");
        const imgH = contentW * (cvs.height / cvs.width);

        if (imgH > pdfH - margin * 2) {
          // Section taller than one page: render across pages with offset slicing
          if (curY > margin) { pdf.addPage(); curY = margin; }
          let rendered = 0;
          while (rendered < imgH) {
            if (rendered > 0) { pdf.addPage(); curY = margin; }
            pdf.addImage(imgData, "PNG", margin, curY - rendered, contentW, imgH);
            rendered += pdfH - margin * 2;
          }
          curY = margin + ((imgH % (pdfH - margin * 2)) || (pdfH - margin * 2));
        } else {
          // Fits on one page — start a new page if not enough room
          if (curY + imgH > pdfH - margin) { pdf.addPage(); curY = margin; }
          pdf.addImage(imgData, "PNG", margin, curY, contentW, imgH);
          curY += imgH + 6;
        }
      }

      const slug = new Date().toISOString().slice(0, 10);
      pdf.save(`session-report-${slug}.pdf`);
    } finally {
      if (container) document.body.removeChild(container);
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Collect all chart URLs from all results
      const allChartUrls = resultHistory.flatMap((e) =>
        e.result.chartUrls.map((u) => `${API_BASE}${u}`)
      );
      const uniqueUrls = [...new Set(allChartUrls)];

      // Fetch all charts as base64
      const base64Map: Record<string, string> = {};
      await Promise.all(
        uniqueUrls.map(async (url) => {
          try {
            base64Map[url] = await fetchAsBase64(url);
          } catch {
            // If fetch fails, fall through to use the URL directly
          }
        })
      );

      const html = buildHtmlReport(resultHistory, messages, base64Map, dateStr);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = new Date().toISOString().slice(0, 10);
      a.download = `session-report-${slug}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">

        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center gap-4 px-8 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold text-gray-900">Session Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {dateStr} · {resultHistory.length} question{resultHistory.length !== 1 ? "s" : ""} analyzed
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
            >
              {isDownloading ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {isDownloading ? "Preparing…" : "Download"}
            </button>

            {/* PDF download — hidden for now, code preserved for future use
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
            >
              {isGeneratingPdf ? "Generating…" : "Download PDF"}
            </button>
            */}

            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — per-question cards */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh] thin-scroll">
          {resultHistory.map((entry, i) => {
            const userMsg = messages.find((m) => m.id === entry.id);
            const question = userMsg?.content ?? `Question ${i + 1}`;
            const r = entry.result;

            const borderColors = [
              "border-l-indigo-500", "border-l-emerald-500",
              "border-l-amber-400", "border-l-rose-400",
              "border-l-violet-500", "border-l-cyan-500",
            ];
            const numberBg = [
              "bg-indigo-500", "bg-emerald-500",
              "bg-amber-400", "bg-rose-400",
              "bg-violet-500", "bg-cyan-500",
            ];
            const border = borderColors[i % borderColors.length];
            const numBg = numberBg[i % numberBg.length];

            return (
              <div key={entry.id} className={`border border-gray-100 border-l-4 ${border} rounded-xl p-7 bg-white shadow-sm`}>
                {/* Question heading */}
                <div className="flex items-start gap-3 mb-5">
                  <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-full ${numBg} flex items-center justify-center text-white text-[11px] font-bold`}>
                    {i + 1}
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
                    &ldquo;{question}&rdquo;
                  </h3>
                </div>

                {/* Summary */}
                {r.summary && (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-indigo-500 mb-2">Summary</p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {r.summary.replace(/##.*?\n/g, "").replace(/\*\*/g, "").replace(/\*/g, "").trim()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Findings */}
                {r.findings.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">
                      Key Findings ({r.findings.length})
                    </p>
                    <div className="space-y-2">
                      {r.findings.map((f, fi) => {
                        const cs = confidenceStyle(f.confidence);
                        return (
                          <div key={fi} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cs.dot}`} />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cs.pill}`}>
                                  {sectionLabel(f.section)} · {f.confidence}
                                </span>
                                <span className="text-[13px] font-medium text-gray-800">{f.title}</span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {f.body.replace(/\*\*/g, "").replace(/\*/g, "")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Charts */}
                {r.chartUrls.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">
                      Charts &amp; Analysis
                    </p>
                    <div className="space-y-3">
                      {r.chartUrls.map((url, ci) => {
                        const inference = r.chartInferences[ci] ?? "";
                        return (
                          <div key={ci} className="border border-gray-100 rounded-xl overflow-hidden flex flex-col md:flex-row">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${API_BASE}${url}`}
                              alt={`Chart ${ci + 1}`}
                              className="w-full md:flex-1 object-contain"
                              crossOrigin="anonymous"
                            />
                            {inference && (
                              <div className="md:w-64 shrink-0 p-4 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-center">
                                <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Chart Insight</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{inference}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overall EDA analysis */}
                {r.edaInferences.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">Overall Analysis</p>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-600 leading-relaxed">{r.edaInferences.join(" ")}</p>
                    </div>
                  </div>
                )}

                {/* SQL Queries */}
                {r.sqlResults.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">SQL Queries</p>
                    <div className="space-y-2">
                      {r.sqlResults.map((sr, qi) => (
                        <div key={qi}>
                          <p className="text-[10px] text-gray-400 mb-1">Query {qi + 1}</p>
                          <pre className="bg-slate-800 text-slate-200 rounded-lg px-4 py-3 text-[11px] overflow-x-auto font-mono leading-relaxed">
                            {sr.query.trim()}
                          </pre>
                          {sr.tableData && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              {sr.tableData.rows.length} rows · {sr.tableData.columns.length} columns
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-400 pt-2">
            Generated by Lens · Retail Customer Journey Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
