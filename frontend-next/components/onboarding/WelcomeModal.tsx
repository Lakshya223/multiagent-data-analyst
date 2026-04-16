"use client";

const CAPABILITIES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
    color: "text-blue-500 bg-blue-50",
    title: "Purchase Behaviour",
    desc: "Revenue, returns, discounts, top categories, store performance, and loyalty vs non-loyalty customers — across 3 million Velora transactions.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    color: "text-violet-500 bg-violet-50",
    title: "Browsing & Sessions",
    desc: "How shoppers navigate the Velora website — add-to-cart rates, checkout drop-offs, device types, referral sources, and day-by-day funnel behaviour.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    color: "text-emerald-500 bg-emerald-50",
    title: "Email Campaigns",
    desc: "Open rates, click-throughs, bounces, and unsubscribes across 5 million Velora email sends — see which campaigns actually drove engagement.",
  },
];

const EXAMPLE_QUESTIONS = [
  "Top categories by revenue?",
  "Loyalty vs non-loyalty customers?",
  "Which campaigns drove the most opens?",
  "Day-wise cart & checkout behaviour?",
];

export default function WelcomeModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />

        <div className="px-8 pt-8 pb-7">

          {/* Header — centered */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                  <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              </div>
              <p className="text-[30px] font-bold text-blue-600 tracking-tight leading-none">Lens</p>
            </div>
            <h1 className="text-[20px] font-semibold text-gray-700 leading-tight mb-3">
              Welcome to Lens !
            </h1>
            <p className="text-[14px] text-gray-500 leading-relaxed max-w-lg">
              Your AI analyst for <span className="font-semibold text-gray-700">Velora</span> — a premium multi-channel fashion retailer. Ask questions in plain English about purchase, browsing, and email data to uncover trends and strategies.
            </p>
          </div>

          {/* Capability cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-gray-100 p-4">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl mb-3 ${c.color}`}>
                  {c.icon}
                </span>
                <p className="text-[14px] font-semibold text-gray-800 mb-1">{c.title}</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Example questions */}
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <span
                  key={q}
                  className="text-[13px] px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">
              We'll give you a quick tour of the interface first.
            </p>
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 text-white text-[14px] font-semibold hover:bg-indigo-700 transition-colors"
            >
              Let's get started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
