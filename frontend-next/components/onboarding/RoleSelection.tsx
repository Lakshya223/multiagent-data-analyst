"use client";

export default function RoleSelection({
  onInstructor,
  onVisitor,
  onVeteran,
}: {
  onInstructor: () => void;
  onVisitor: () => void;
  onVeteran: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-6 bg-white">
      {/* Logo / branding */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <circle cx="11" cy="11" r="3" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
          Lens
        </h1>
        <p className="text-base text-gray-500">
          Retail Intelligence · Who are you today?
        </p>
      </div>

      {/* Role cards */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {/* Instructor */}
        <button
          onClick={onInstructor}
          className="flex-1 rounded-2xl border-2 border-indigo-100 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100 transition-colors p-8 text-center group"
        >
          <div className="text-4xl mb-3">🎓</div>
          <p className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors text-lg">
            Instructor
          </p>
          <p className="text-xs text-gray-400 mt-1">
            See what we built + grading overview
          </p>
        </button>

        {/* Visitor */}
        <button
          onClick={onVisitor}
          className="flex-1 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-colors p-8 text-center group"
        >
          <div className="text-4xl mb-3">👋</div>
          <p className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors text-lg">
            Visitor
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Explore the app with a guided tour
          </p>
        </button>

        {/* Veteran */}
        <button
          onClick={onVeteran}
          className="flex-1 rounded-2xl border-2 border-amber-100 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-colors p-8 text-center group"
        >
          <div className="text-4xl mb-3">⚡</div>
          <p className="font-semibold text-gray-800 group-hover:text-amber-700 transition-colors text-lg">
            Veteran
          </p>
          <p className="text-xs text-gray-400 mt-1">
            I know what I'm doing here
          </p>
        </button>
      </div>
    </div>
  );
}
