"use client";

export default function InstructorOptions({
  onFlip,
  onContinue,
}: {
  onFlip: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6 bg-white">
      {/* Heading */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
          Welcome, Instructor
        </p>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          What would you like to do?
        </h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Grading shortcut — triggers card flip */}
        <button
          onClick={onFlip}
          className="w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-500 hover:bg-indigo-100 transition-colors p-6 text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <p className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
              We made grading easier for you
            </p>
          </div>
          <p className="text-xs text-gray-400 ml-9">
            See what we built and how it maps to the rubric
          </p>
        </button>

        {/* Continue to site */}
        <button
          onClick={onContinue}
          className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-colors p-6 text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚀</span>
            <p className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
              Continue to site
            </p>
          </div>
          <p className="text-xs text-gray-400 ml-9">
            Explore the app with a guided tour
          </p>
        </button>
      </div>
    </div>
  );
}
