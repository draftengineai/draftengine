"use client";

import React, { useRef, useEffect, useState } from "react";
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
  isChanged?: boolean;
  originalText?: string;
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
  isChanged,
  originalText,
}: StepEditorProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);

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
      data-changed={isChanged ? "true" : undefined}
      style={{
        border: "1px solid var(--border)",
        borderLeft: isChanged ? "4px solid #0d9488" : "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isChanged ? "rgba(13,148,136,0.04)" : "#FFFFFF",
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
        {isChanged && (
          <span
            data-testid="changed-badge"
            style={{
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: "rgba(13,148,136,0.12)",
              color: "#0d9488",
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            Changed
          </span>
        )}
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

          {/* View original toggle for changed steps */}
          {isChanged && originalText && (
            <div>
              <button
                data-testid={`toggle-original-${index}`}
                onClick={() => setShowOriginal(!showOriginal)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#0d9488",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showOriginal ? "Hide original" : "View original"}
              </button>
              {showOriginal && (
                <div
                  data-testid={`original-text-${index}`}
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      marginBottom: 4,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Original:
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: originalText }}
                  />
                </div>
              )}
            </div>
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
