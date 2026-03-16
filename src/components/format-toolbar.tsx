"use client";

import React from "react";

const btnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--text-secondary)",
  transition: "background 120ms ease, border-color 120ms ease",
};

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={btnStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}

export default function FormatToolbar() {
  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "6px 24px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      {/* Bold */}
      <ToolbarButton
        title="Bold (Ctrl+B) — use only for UI element names"
        onClick={() => exec("bold")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 2.5h4.5a3 3 0 0 1 0 6H4V2.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M4 8.5h5.5a3 3 0 0 1 0 6H4V8.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </ToolbarButton>

      {/* Underline */}
      <ToolbarButton
        title="Underline (Ctrl+U)"
        onClick={() => exec("underline")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 2.5v5a4 4 0 0 0 8 0v-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M3 14h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </ToolbarButton>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          backgroundColor: "var(--border)",
          margin: "0 4px",
        }}
      />

      {/* Undo */}
      <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => exec("undo")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 5.5h7a3.5 3.5 0 0 1 0 7H7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 3L3 5.5L5.5 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolbarButton>

      {/* Redo */}
      <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => exec("redo")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13 5.5H6a3.5 3.5 0 0 0 0 7h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 3L13 5.5L10.5 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolbarButton>
    </div>
  );
}
