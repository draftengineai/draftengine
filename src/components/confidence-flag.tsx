"use client";

import React from "react";
import type { ConfidenceFlag as ConfidenceFlagType } from "@/lib/types/article";

interface ConfidenceFlagProps {
  flag: ConfidenceFlagType;
  onDismiss: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          minWidth: 50,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, color: "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function ConfidenceFlag({ flag, onDismiss }: ConfidenceFlagProps) {
  return (
    <div
      style={{
        border: "1px solid #E8C97A",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--amber-light)",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--amber-dark)",
        }}
      >
        {"\u26A0"} AI flagged this step
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px" }}>
        <Row label="What" value={flag.what} />
        <Row label="Why" value={flag.why} />
        <Row label="Action" value={flag.action} />
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 12px", display: "flex" }}>
        <button
          onClick={onDismiss}
          style={{
            fontSize: 12,
            backgroundColor: "var(--green-light)",
            color: "var(--green-dark)",
            border: "none",
            borderRadius: 20,
            padding: "4px 12px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          I&apos;ve verified — dismiss
        </button>
      </div>
    </div>
  );
}
