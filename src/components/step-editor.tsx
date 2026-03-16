"use client";

import React, { useRef, useEffect } from "react";
import type { Step, ConfidenceFlag as ConfidenceFlagType } from "@/lib/types/article";
import ConfidenceFlag from "./confidence-flag";
import ScreenshotSlot from "./screenshot-slot";

interface StepEditorProps {
  step: Step;
  index: number;
  totalSteps: number;
  flag: ConfidenceFlagType | null;
  screenshotFilled: boolean;
  onStepChange: (index: number, updated: Step) => void;
  onScreenshotToggle: (index: number) => void;
  onFlagDismiss: (index: number) => void;
  readOnly?: boolean;
}

export default function StepEditor({
  step,
  index,
  totalSteps,
  flag,
  screenshotFilled,
  onStepChange,
  onScreenshotToggle,
  onFlagDismiss,
  readOnly,
}: StepEditorProps) {
  const textRef = useRef<HTMLDivElement>(null);

  // Set content via ref only when step.text changes externally (not during typing)
  useEffect(() => {
    if (textRef.current && textRef.current.innerHTML !== step.text) {
      textRef.current.innerHTML = step.text;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.text]);

  return (
    <div
      data-step={index}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "var(--purple-light)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
          Step {index + 1} of {totalSteps}:
        </span>
        {flag && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: "var(--amber-light)",
              color: "var(--amber-dark)",
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            Check
          </span>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          padding: 16,
        }}
      >
        {/* Left column: text + flag */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            ref={textRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            style={{
              outline: "none",
              borderRadius: 4,
              padding: 4,
              fontSize: 14,
              lineHeight: 1.7,
              minHeight: 60,
              transition: "background 120ms ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(55,138,221,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              if (textRef.current) {
                onStepChange(index, { ...step, text: textRef.current.innerHTML });
              }
            }}
          />
          {flag && (
            <ConfidenceFlag flag={flag} onDismiss={() => onFlagDismiss(index)} />
          )}
        </div>

        {/* Right column: screenshot */}
        <ScreenshotSlot
          filled={screenshotFilled}
          description={step.imgDesc}
          onToggle={() => onScreenshotToggle(index)}
          readOnly={readOnly}
          index={index}
        />
      </div>
    </div>
  );
}
