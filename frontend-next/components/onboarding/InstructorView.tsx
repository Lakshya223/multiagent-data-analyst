"use client";

function Check() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-widest text-indigo-400 mb-3">
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/8 border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  );
}

function RubricRow({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex gap-3 items-start">
      <Check />
      <div>
        <span className="text-[15px] font-semibold text-white">{label}</span>
        <span className="text-[14px] text-white/55 ml-2">{detail}</span>
      </div>
    </li>
  );
}

export default function InstructorView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-indigo-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="text-center pt-10 pb-6 px-8 shrink-0">
        <p className="text-[12px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
          Columbia MSDS · Agentic AI · Project 2
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Instructor Overview</h1>
        <p className="text-base text-white/50 mt-1">
          Lens — Retail Customer Journey Intelligence Agent
        </p>
      </div>

      <div className="flex flex-col gap-5 px-8 pb-10 max-w-4xl mx-auto w-full">

        {/* ── Required Checklist ─────────────────────────────── */}
        <Card>
          <SectionLabel>Required — all 7 satisfied</SectionLabel>
          <ul className="space-y-3">
            <RubricRow
              label="Frontend"
              detail="Next.js 16 + React 19 + Tailwind CSS v4. Split-panel chat + results UI with SSE streaming. Deployed on GCP Cloud Run."
            />
            <RubricRow
              label="Agent Framework"
              detail="LangGraph StateGraph with 5 nodes: Supervisor, SQL Agent, EDA Agent, Hypothesis Agent, Fallback."
            />
            <RubricRow
              label="Tool Calling"
              detail="SQL Agent calls BigQuery SDK; EDA Agent calls exec() sandbox (pandas/matplotlib/plotly); Hypothesis Agent calls LLM with structured JSON output."
            />
            <RubricRow
              label="Non-Trivial Dataset"
              detail="3 BigQuery tables · 11M+ total rows · fetched at runtime via google-cloud-bigquery. No data is bundled."
            />
            <RubricRow
              label="Multi-Agent Pattern"
              detail="Orchestrator-handoff (Supervisor routes to specialists) + Iterative refinement loop (Hypothesis → Supervisor → SQL → EDA → Hypothesis)."
            />
            <RubricRow
              label="Deployed"
              detail="Backend on Cloud Run (FastAPI). Frontend on Cloud Run (Next.js). Artifacts on GCS."
            />
            <RubricRow
              label="README.md"
              detail="Covers architecture, dataset, pipeline steps, grab-bag features, local setup, and deploy commands."
            />
          </ul>
        </Card>

        {/* ── Three-Step Pipeline ────────────────────────────── */}
        <div>
          <SectionLabel>Three-Step Pipeline</SectionLabel>
          <div className="flex flex-col items-stretch gap-0">

            {/* Step 1 */}
            <div className="rounded-xl bg-white/8 border border-emerald-500/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[13px] font-bold shrink-0">1</span>
                <p className="text-[16px] font-semibold text-emerald-400">Collect</p>
              </div>
              <ul className="space-y-2">
                <RubricRow label="SQL Composition" detail="SQL Agent receives the user question + full injected schema (30–45 cols per table) and writes a BigQuery SQL query dynamically. backend/agents/sql_agent.py" />
                <RubricRow label="Runtime Data Retrieval" detail="3 BigQuery tables · transaction_data (3M rows, 7 months), clickstream_session_data (3M rows, 10 days), email_data (5M rows, 2 months). Queried live — nothing pre-loaded." />
              </ul>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center py-1 shrink-0">
              <div className="w-px h-3 bg-white/20" />
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M6 8L0 0h12L6 8z" fill="rgba(255,255,255,0.2)"/></svg>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl bg-white/8 border border-sky-500/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-[13px] font-bold shrink-0">2</span>
                <p className="text-[16px] font-semibold text-sky-400">Explore &amp; Analyze</p>
              </div>
              <ul className="space-y-2">
                <RubricRow label="Statistical Aggregation" detail="EDA Agent computes means, medians, distributions, correlations, and growth rates over the retrieved CSV. backend/agents/eda_agent.py" />
                <RubricRow label="Filtering & Grouping" detail="Agent segments data by category, time period, and threshold using pandas groupby, pivot_table, and resample." />
                <RubricRow label="Code Execution" detail="Writes Python at runtime (pandas, numpy, matplotlib, plotly) and runs it via exec() in an isolated namespace. Charts saved as PNG to session folder." />
              </ul>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center py-1 shrink-0">
              <div className="w-px h-3 bg-white/20" />
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M6 8L0 0h12L6 8z" fill="rgba(255,255,255,0.2)"/></svg>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl bg-white/8 border border-violet-500/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-[13px] font-bold shrink-0">3</span>
                <p className="text-[16px] font-semibold text-violet-400">Hypothesize</p>
              </div>
              <ul className="space-y-2">
                <RubricRow label="Natural Language Summary" detail="Hypothesis Agent produces a 3–5 sentence Summary grounded in specific data points from SQL and EDA. backend/agents/hypothesis_agent.py" />
                <RubricRow label="Visualization with Caption" detail="EDA Agent generates multiple charts per question. A separate LLM call produces per-chart insight captions displayed alongside each chart." />
                <RubricRow label="Report with Citations" detail="Full markdown report: Summary → Hypotheses (with Supporting Evidence + Confidence Level) → Data Evidence → Recommendations. Saved as report.md per session." />
              </ul>
            </div>

          </div>
        </div>

        {/* ── Grab-Bag ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>
            </span>
            <p className="text-[17px] font-semibold text-white">Grab-Bag — all 5 implemented</p>
            <span className="text-[14px] text-white/40">(minimum 2 required)</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>,
                icon2: <path d="M3 3v5h5"/>,
                title: "Iterative Refinement Loop",
                desc: "Hypothesis Agent signals missing data → Supervisor re-routes through SQL → EDA → Hypothesis. Repeats up to 8 total agent calls (deep research pattern).",
              },
              {
                icon: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
                title: "Code Execution",
                desc: "EDA Agent writes and runs Python at runtime. Each round: new code generated, executed in isolated exec() namespace, charts produced.",
              },
              {
                icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
                title: "Artifacts",
                desc: "CSVs (SQL results), PNGs (charts), report.md — written to /tmp/sessions/{id}/ and uploaded to GCS. Served to frontend via artifact endpoint.",
              },
              {
                icon: <><path d="M2 12h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-6a2 2 0 0 1 2-2h2"/><path d="M22 12h-2a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-6a2 2 0 0 0-2-2H8"/></>,
                title: "Structured Output",
                desc: "Supervisor emits {next, reason, task} JSON. Sufficiency check emits {sufficient, missing} JSON. SQL feasibility uses INFEASIBLE: prefix. Findings parsed from structured markdown.",
              },
              {
                icon: <><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></>,
                title: "Data Visualization",
                desc: "Multiple charts generated per query. Frontend shows them in the Analysis tab with per-chart captions and an overall analysis narrative.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white/8 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sky-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}
                      {item.icon2}
                    </svg>
                  </span>
                  <p className="text-[15px] font-semibold text-white">{item.title}</p>
                </div>
                <p className="text-[14px] text-white/55 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Dataset ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </span>
            <p className="text-[17px] font-semibold text-white">Dataset — BigQuery</p>
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white/40">Table</th>
                  <th className="text-left px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white/40">Rows</th>
                  <th className="text-left px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white/40">Period</th>
                  <th className="text-left px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-white/40">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "transaction_data",
                    rows: "~3 million",
                    range: "Jan 1 – Jul 30, 2025 · 7 months",
                    desc: "Order + item-level data: revenue, discounts, returns, product categories, brand, loyalty status, store, channel, is_international.",
                  },
                  {
                    name: "clickstream_session_data",
                    rows: "~3 million",
                    range: "Jan 2 – Jan 11, 2025 · 10 days",
                    desc: "Web session-level data: add-to-cart flag, checkout flag, order flag, device type, browser, OS, referral domain, loyalty flag.",
                  },
                  {
                    name: "email_data",
                    rows: "~5 million",
                    range: "Jan 1 – Feb 27, 2025 · 2 months",
                    desc: "Campaign sends per subscriber: open, click, bounce, unsubscribe flags, job name, send date.",
                  },
                ].map((t, i) => (
                  <tr key={t.name} className={`border-b border-white/10 last:border-0 ${i % 2 === 0 ? "" : "bg-white/3"}`}>
                    <td className="px-4 py-3 font-mono text-sky-400 whitespace-nowrap text-[14px]">{t.name}</td>
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap text-[15px]">{t.rows}</td>
                    <td className="px-4 py-3 text-white/55 whitespace-nowrap text-[14px]">{t.range}</td>
                    <td className="px-4 py-3 text-white/55 text-[14px] leading-relaxed">{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tech Stack ─────────────────────────────────────── */}
        <Card>
          <SectionLabel>Tech Stack</SectionLabel>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              ["LLM", "Gemini 2.0 Flash · Vertex AI · temperature=0"],
              ["Agent Framework", "LangGraph StateGraph"],
              ["Backend", "FastAPI · uvicorn · SSE streaming"],
              ["Frontend", "Next.js 16 · React 19 · Tailwind CSS v4"],
              ["Data", "Google BigQuery"],
              ["Artifacts", "Google Cloud Storage"],
              ["Deploy", "GCP Cloud Run (backend + frontend)"],
              ["Container", "Docker"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2 items-start">
                <span className="text-[13px] font-semibold text-white/40 w-32 shrink-0 pt-px">{label}</span>
                <span className="text-[14px] text-white/70">{value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Back */}
      <div className="text-center pb-8 shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-white/40 hover:text-white transition-colors underline underline-offset-4"
        >
          ← Back to landing
        </button>
      </div>
    </div>
  );
}
