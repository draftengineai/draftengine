"use client";

import React, { useState } from "react";

interface ScreenshotSlotProps {
  filled: boolean;
  description: string;
  onToggle: () => void;
  readOnly?: boolean;
  index?: number;
}

export default function ScreenshotSlot({
  filled,
  description,
  onToggle,
  readOnly,
  index,
}: ScreenshotSlotProps) {
  const [hovered, setHovered] = useState(false);

  if (filled) {
    return (
      <div
        style={{
          borderRadius: 8,
          minHeight: 180,
          position: "relative",
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--purple-light), var(--purple-light) 10px, #d5d2e5 10px, #d5d2e5 20px)",
          display: "flex",
          alignItems: "flex-end",
          padding: 12,
        }}
      >
        {/* Badge */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: "var(--green-light)",
            color: "var(--green-dark)",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {"\u2713"} Screenshot
        </span>

        {/* Remove button */}
        {!readOnly && (
          <button
            onClick={onToggle}
            title="Remove screenshot"
            aria-label="Remove screenshot"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.45)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {"\u00D7"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-screenshot-slot={index}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      aria-label={`Add screenshot: ${description}`}
      onClick={readOnly ? undefined : onToggle}
      onKeyDown={readOnly ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px dashed ${hovered && !readOnly ? "var(--purple)" : "var(--blue)"}`,
        backgroundColor: hovered && !readOnly ? "var(--purple-light)" : "var(--blue-light)",
        borderRadius: 8,
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: readOnly ? "default" : "pointer",
        transition: "border-color 120ms ease, background-color 120ms ease",
        padding: 16,
      }}
    >
      {/* Camera icon */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        style={{ color: hovered && !readOnly ? "var(--purple)" : "var(--blue)" }}
      >
        <rect
          x="3"
          y="7"
          width="22"
          height="16"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h5A1.5 1.5 0 0 1 18 5.5V7"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="15" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: hovered && !readOnly ? "var(--purple)" : "var(--blue)",
        }}
      >
        Click to add
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </div>
  );
}
