"use client";
import { useEffect, useState } from "react";
import { TourStep } from "@/types";
import { TourTargetRect } from "@/hooks/useTour";

const TOOLTIP_W = 280;
const TOOLTIP_H = 160;
const GAP = 16;
const PAD = 8;

interface Point {
  x: number;
  y: number;
}

function getTooltipPos(
  target: TourTargetRect,
  vw: number,
  vh: number
): { top: number; left: number } {
  const cx = target.left + target.width / 2;
  const bottom = target.top + target.height;

  // Prefer below
  if (bottom + TOOLTIP_H + GAP < vh) {
    return {
      top: bottom + GAP,
      left: Math.min(Math.max(8, cx - TOOLTIP_W / 2), vw - TOOLTIP_W - 8),
    };
  }
  // Prefer above
  if (target.top - TOOLTIP_H - GAP > 0) {
    return {
      top: target.top - TOOLTIP_H - GAP,
      left: Math.min(Math.max(8, cx - TOOLTIP_W / 2), vw - TOOLTIP_W - 8),
    };
  }
  // Prefer right
  const rightLeft = target.left + target.width + GAP;
  if (rightLeft + TOOLTIP_W < vw) {
    return {
      top: Math.min(Math.max(8, target.top), vh - TOOLTIP_H - 8),
      left: rightLeft,
    };
  }
  // Fall back left
  return {
    top: Math.min(Math.max(8, target.top), vh - TOOLTIP_H - 8),
    left: Math.max(8, target.left - TOOLTIP_W - GAP),
  };
}

interface TourOverlayProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: TourTargetRect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function TourOverlay({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onBack,
  onSkip,
}: TourOverlayProps) {
  const [vp, setVp] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const tooltipPos = targetRect
    ? getTooltipPos(targetRect, vp.w, vp.h)
    : { top: vp.h / 2 - TOOLTIP_H / 2, left: vp.w / 2 - TOOLTIP_W / 2 };

  const tooltipCenter: Point = {
    x: tooltipPos.left + TOOLTIP_W / 2,
    y: tooltipPos.top + TOOLTIP_H / 2,
  };

  const targetCenter: Point = targetRect
    ? {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
      }
    : tooltipCenter;

  return (
    <>
      {/* Full-screen dark backdrop (only visible where no highlight punches through) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.01)", // near-transparent; shadow from highlight box does the darkening
          zIndex: 50,
          pointerEvents: "none",
        }}
      />

      {/* Highlight box — box-shadow creates the dark overlay effect */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            zIndex: 51,
            pointerEvents: "none",
          }}
        />
      )}

      {/* SVG dotted arrow from tooltip to target */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 52,
        }}
      >
        <line
          x1={tooltipCenter.x}
          y1={tooltipCenter.y}
          x2={targetCenter.x}
          y2={targetCenter.y}
          stroke="#6366F1"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.75"
        />
        {/* Arrowhead at target end */}
        <circle
          cx={targetCenter.x}
          cy={targetCenter.y}
          r="3"
          fill="#6366F1"
          opacity="0.75"
        />
      </svg>

      {/* Tooltip card */}
      <div
        key={currentStep}
        className="tour-tooltip-enter"
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
          background: "#fff",
          borderRadius: 14,
          padding: "16px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 53,
        }}
      >
        {/* Step counter dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all ${
                i === currentStep
                  ? "w-4 h-1.5 bg-indigo-500"
                  : "w-1.5 h-1.5 bg-gray-200"
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] font-medium text-gray-400">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={onBack}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {currentStep === totalSteps - 1 ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
