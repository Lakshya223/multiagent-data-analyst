"use client";

export default function InstructorView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-indigo-950 text-white px-8 gap-10">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
          Columbia MSDS · Agentic AI · Project 2
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Instructor Overview</h1>
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <div className="rounded-2xl bg-white/10 p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-3">What We Built</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            A multi-agent AI pipeline that accepts natural language questions and
            routes them through a LangGraph supervisor to specialized SQL, EDA,
            and Hypothesis agents — producing charts, findings, and raw data
            backed by BigQuery.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-3">Relevance to Course</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Demonstrates agentic orchestration, tool-use, multi-step reasoning,
            and deployed frontend integration — core themes of the Agentic AI
            curriculum. Content to be expanded with specific rubric mappings.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-3">Tech Stack</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            LangGraph · Gemini 2.0 Flash (Vertex AI) · BigQuery · FastAPI (SSE
            streaming) · Next.js 16 · Tailwind CSS v4
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-3">Grading Notes</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            {/* Placeholder — fill with specific rubric notes */}
            Rubric alignment and submission details will be added here before
            the final presentation.
          </p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-sm text-white/50 hover:text-white transition-colors underline underline-offset-4"
      >
        ← Back to landing
      </button>
    </div>
  );
}
