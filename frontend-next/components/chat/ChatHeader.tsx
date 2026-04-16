export default function ChatHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
      {/* Lens icon */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </div>
      <div>
        <p className="text-[15px] font-medium text-gray-900 leading-none">Lens</p>
        <p className="text-[12px] text-gray-400 mt-0.5">Retail Intelligence</p>
      </div>
    </div>
  );
}
