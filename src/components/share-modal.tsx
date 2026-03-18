"use client";

import React, { useState, useRef, useEffect } from "react";

interface ShareModalProps {
  isOpen: boolean;
  articleId: string;
  onClose: () => void;
  onShare: (note: string) => void;
  showReviewerNote?: boolean;
}

export default function ShareModal({
  isOpen,
  articleId,
  onClose,
  onShare,
  showReviewerNote = true,
}: ShareModalProps) {
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const previewUrl = `gatedoc.vercel.app/preview/${articleId}`;

  async function handleSaveAndCopy() {
    setSharing(true);
    try {
      await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shared",
          reviewNote: note || null,
        }),
      });
      try {
        await navigator.clipboard.writeText(`https://${previewUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard fallback — ignore
      }
      onShare(note);
    } catch {
      // allow caller to handle errors via onShare
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="share-modal"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="share-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        tabIndex={-1}
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: 12,
          maxWidth: 440,
          width: "100%",
          padding: "20px 24px",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <h3
          id="share-modal-title"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          Share with your Reviewer
        </h3>
        <p
          className="share-desc"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
          They&apos;ll see a read-only preview with your latest edits.
        </p>

        {/* URL row */}
        <div
          className="share-url"
          style={{
            padding: "8px 10px",
            fontSize: 12,
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--text-secondary)",
            lineHeight: "20px",
            marginBottom: 12,
          }}
        >
          {previewUrl}
        </div>

        {/* Note textarea */}
        {showReviewerNote && (
          <>
            <label
              htmlFor="share-note"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Note to Reviewer{" "}
              <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>
                (optional)
              </span>
            </label>
            <textarea
              id="share-note"
              className="share-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Please check step 3 — I wasn't sure about the filter names..."
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                height: 64,
                resize: "none",
                fontFamily: "inherit",
                color: "var(--text)",
                backgroundColor: "var(--bg-card)",
                lineHeight: 1.5,
              }}
            />
          </>
        )}

        {/* Footer */}
        <div
          className="share-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text)",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card)";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndCopy}
            disabled={sharing}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--radius)",
              border: "none",
              backgroundColor: sharing
                ? "var(--accent-hover)"
                : "var(--accent)",
              color: "#FFFFFF",
              transition: "background 120ms ease",
              opacity: sharing ? 0.7 : 1,
              cursor: sharing ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!sharing)
                e.currentTarget.style.backgroundColor = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (!sharing)
                e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
          >
            {sharing ? "Saving..." : copied ? "Saved & Copied!" : "Save & Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
