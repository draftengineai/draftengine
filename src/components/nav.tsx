"use client";

import React from "react";

interface NavProps {
  userName: string;
  showBack?: boolean;
  onBack?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Nav({ userName, showBack, onBack }: NavProps) {
  return (
    <nav
      data-print-hide
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        height: 52,
        backgroundColor: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        fontFamily: "var(--font)",
      }}
    >
      {/* Left section */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Logo */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          G
        </div>

        {/* Title group */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            DraftEngine
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "var(--text-tertiary)",
            }}
          >
            Knowledge Center
          </span>
        </div>

        {/* Back button */}
        {showBack && (
          <>
            <div
              style={{
                width: 1,
                height: 20,
                backgroundColor: "var(--border)",
                margin: "0 4px",
              }}
            />
            <button
              onClick={onBack}
              aria-label="Back to My articles"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                padding: "4px 8px",
                borderRadius: "var(--radius)",
                transition: "background 120ms ease, color 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M8.75 3.5L5.25 7L8.75 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              My articles
            </button>
          </>
        )}
      </div>

      {/* Right section — user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "var(--purple-light)",
            color: "var(--purple-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {getInitials(userName)}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {userName}
        </span>
      </div>
    </nav>
  );
}
