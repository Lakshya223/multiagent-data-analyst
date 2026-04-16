export default function UserBubble({
  content,
  onClick,
  isActive,
}: {
  content: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const clickable = !!onClick;

  return (
    <div className="flex justify-end mb-3">
      <div
        onClick={onClick}
        className={[
          "bg-blue-500 text-white text-[14px] px-4 py-2 rounded-xl max-w-[78%] leading-relaxed relative",
          clickable ? "cursor-pointer hover:brightness-110 transition-[filter]" : "",
          isActive ? "ring-2 ring-white ring-offset-2 ring-offset-blue-500" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {content}
        {/* Small indicator when this bubble has a result to view */}
        {clickable && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-300 rounded-full flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
