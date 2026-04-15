"use client";
import { useState, useCallback, useEffect } from "react";
import { TourStep, TOUR_STEPS } from "@/types";

export interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface UseTourReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep;
  targetRect: TourTargetRect | null;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
}

export function useTour(onComplete: () => void): UseTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);

  const measureTarget = useCallback((stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    measureTarget(currentStep);
    const onResize = () => measureTarget(currentStep);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive, currentStep, measureTarget]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const nextStep = prev + 1;
      if (nextStep >= TOUR_STEPS.length) {
        setIsActive(false);
        onComplete();
        return prev;
      }
      return nextStep;
    });
  }, [onComplete]);

  const back = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep],
    targetRect,
    start,
    next,
    back,
    skip,
  };
}
