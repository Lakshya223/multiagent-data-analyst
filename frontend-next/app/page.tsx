"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useTour } from "@/hooks/useTour";
import { AppPhase } from "@/types";
import StatusBar from "@/components/StatusBar";
import ChatPanel from "@/components/chat/ChatPanel";
import ResultsPanel from "@/components/results/ResultsPanel";
import RoleSelection from "@/components/onboarding/RoleSelection";
import InstructorOptions from "@/components/onboarding/InstructorOptions";
import InstructorView from "@/components/onboarding/InstructorView";
import WelcomeModal from "@/components/onboarding/WelcomeModal";
import TourOverlay from "@/components/onboarding/TourOverlay";

const MIN_CHAT_WIDTH = 280;
const MAX_CHAT_WIDTH = 900;
const DEFAULT_CHAT_WIDTH = 420; // SSR-safe fallback

export default function Home() {
  const { messages, currentResult, resultHistory, status, analyze, reset, selectResult, resultIds, selectedId } = useAnalysis();
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [isAnimatingWidth, setIsAnimatingWidth] = useState(false);
  const hasAutoSlid = useRef(false);
  const [appPhase, setAppPhase] = useState<AppPhase>("landing");
  const [isFlipped, setIsFlipped] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Set chat width to 50% of viewport on mount
  useEffect(() => {
    setChatWidth(Math.min(MAX_CHAT_WIDTH, Math.floor(window.innerWidth * 0.5)));
  }, []);

  // Slide chat panel narrower when the first result arrives
  useEffect(() => {
    if (currentResult !== null && !hasAutoSlid.current) {
      hasAutoSlid.current = true;
      setIsAnimatingWidth(true);
      setChatWidth(400);
      const t = setTimeout(() => setIsAnimatingWidth(false), 600);
      return () => clearTimeout(t);
    }
  }, [currentResult]);

  // Tour completes → go to app
  const tour = useTour(() => setAppPhase("app"));

  // Dismiss landing and start the tour (double-rAF to ensure DOM is painted)
  const startTour = useCallback(() => {
    setAppPhase("tour");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => tour.start())
    );
  }, [tour]);

  // ── Landing handlers ───────────────────────────────────
  const handleInstructor = useCallback(() => {
    setAppPhase("instructor_options");
  }, []);

  const handleVisitor = useCallback(() => {
    setAppPhase("welcome");
  }, []);

  const handleVeteran = useCallback(() => {
    setAppPhase("app");
  }, []);

  // ── Instructor options handlers ────────────────────────
  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleFlipBack = useCallback(() => {
    setIsFlipped(false);
  }, []);

  const handleInstructorContinue = useCallback(() => {
    setAppPhase("welcome");
  }, []);

  // ── Drag-to-resize divider ─────────────────────────────
  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: chatWidth };

      const onMouseMove = (mv: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = mv.clientX - dragRef.current.startX;
        const next = Math.min(
          MAX_CHAT_WIDTH,
          Math.max(MIN_CHAT_WIDTH, dragRef.current.startWidth + delta)
        );
        setChatWidth(next);
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [chatWidth]
  );

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB] overflow-hidden">

      {/* ── Landing overlay — role selection ── */}
      {appPhase === "landing" && (
        <div className="fixed inset-0 z-40 bg-white">
          <RoleSelection onInstructor={handleInstructor} onVisitor={handleVisitor} onVeteran={handleVeteran} />
        </div>
      )}

      {/* ── Welcome modal — shown before tour ── */}
      {appPhase === "welcome" && (
        <WelcomeModal onStart={startTour} />
      )}

      {/* ── Instructor options — flip scene ── */}
      {appPhase === "instructor_options" && (
        <div className="fixed inset-0 z-40">
          <div className="flip-scene">
            <div className={`flip-card${isFlipped ? " is-flipped" : ""}`}>
              <div className="flip-card__face flip-card__face--front">
                <InstructorOptions
                  onFlip={handleFlip}
                  onContinue={handleInstructorContinue}
                />
              </div>
              <div className="flip-card__face flip-card__face--back">
                <InstructorView onBack={handleFlipBack} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tour overlay — renders on top of main app ── */}
      {(appPhase === "tour" || appPhase === "app") && tour.isActive && (
        <TourOverlay
          step={tour.step}
          currentStep={tour.currentStep}
          totalSteps={tour.totalSteps}
          targetRect={tour.targetRect}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
        />
      )}

      {/* ── Main app (always rendered beneath overlays) ── */}
      <div data-tour="status-bar">
        <StatusBar status={status} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div
          style={{
            width: chatWidth,
            minWidth: MIN_CHAT_WIDTH,
            maxWidth: MAX_CHAT_WIDTH,
            transition: isAnimatingWidth ? "width 550ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
          className="shrink-0 flex flex-col h-full border-r border-gray-200 bg-white"
          data-tour="chat-panel"
        >
          <ChatPanel
            messages={messages}
            status={status}
            onSend={(q, m) => analyze(q, m)}
            onSelectResult={selectResult}
            resultIds={resultIds}
            selectedId={selectedId}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors select-none"
          title="Drag to resize"
        />

        {/* Results panel */}
        <div className="flex-1 overflow-hidden" data-tour="results-panel">
          <ResultsPanel
            result={currentResult}
            status={status}
            onSelect={analyze}
            onReset={currentResult ? reset : undefined}
            resultHistory={resultHistory}
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
