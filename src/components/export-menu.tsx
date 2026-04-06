"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Article } from "@/lib/types/article";
import { sanitizeHTML } from "@/lib/sanitize";

interface ExportMenuProps {
  article: Article;
}

/** Convert simple HTML content to clean Markdown. */
function htmlToMarkdown(html: string): string {
  let md = html;
  // Bold
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  // Underline + bold (Notes/Tips/Warnings)
  md = md.replace(/<u><b>(.*?)<\/b><\/u>/gi, "***$1***");
  md = md.replace(/<u>(.*?)<\/u>/gi, "_$1_");
  // Italic
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  // Paragraphs
  md = md.replace(/<p[^>]*>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n");
  // Images / screenshot placeholders
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "![Screenshot: $1]()");
  md = md.replace(/<img[^>]*src="\[SCREENSHOT_PLACEHOLDER:\s*(.*?)\]"[^>]*>/gi, "![Screenshot: $1]()");
  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&apos;/g, "'");
  // Clean up excess whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

function buildMarkdown(article: Article): string {
  const lines: string[] = [];
  const activeType = article.activeType;

  lines.push(`# ${article.title}`);
  lines.push("");

  if (activeType === "howto" && article.content.howto) {
    const ht = article.content.howto;
    if (ht.overview) {
      lines.push(`> ${ht.overview}`);
      lines.push("");
    }
    for (const step of ht.steps) {
      lines.push(`## ${step.heading}`);
      lines.push("");
      lines.push(htmlToMarkdown(step.text));
      lines.push("");
      if (step.imgPath || step.imgDesc) {
        lines.push(`![Screenshot: ${step.imgDesc || ""}](${step.imgPath || ""})`);
        lines.push("");
      }
    }
  } else if (activeType === "wn" && article.content.wn) {
    const wn = article.content.wn;
    if (wn.overview) {
      lines.push(`> ${wn.overview}`);
      lines.push("");
    }
    if (wn.introduction) {
      lines.push("## Introduction");
      lines.push("");
      lines.push(htmlToMarkdown(wn.introduction));
      lines.push("");
    }
    if (wn.whereToFind) {
      lines.push("## Where to Find It");
      lines.push("");
      lines.push(htmlToMarkdown(wn.whereToFind));
      lines.push("");
    }
    if (wn.closing) {
      lines.push("---");
      lines.push("");
      lines.push(`**${wn.closing}**`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildHTML(article: Article): string {
  const activeType = article.activeType;
  const el = document.querySelector("[data-article-canvas]");
  if (el) {
    return el.innerHTML;
  }
  // Fallback: build from article data (sanitize to prevent XSS in clipboard)
  if (activeType === "howto" && article.content.howto) {
    const ht = article.content.howto;
    const stepsHtml = ht.steps
      .map(
        (s) =>
          `<h2>${sanitizeHTML(s.heading)}</h2>\n${sanitizeHTML(s.text)}`
      )
      .join("\n\n");
    return `<h1>${sanitizeHTML(article.title)}</h1>\n<p><em>${sanitizeHTML(ht.overview)}</em></p>\n\n${stepsHtml}`;
  }
  if (activeType === "wn" && article.content.wn) {
    const wn = article.content.wn;
    return `<h1>${sanitizeHTML(article.title)}</h1>\n<p><em>${sanitizeHTML(wn.overview)}</em></p>\n<h2>Introduction</h2>\n${sanitizeHTML(wn.introduction)}\n<h2>Where to Find It</h2>\n${sanitizeHTML(wn.whereToFind)}\n<p><strong>${sanitizeHTML(wn.closing)}</strong></p>`;
  }
  return "";
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function ExportMenu({ article }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleCopy = async (format: "html" | "markdown") => {
    const text =
      format === "html" ? buildHTML(article) : buildMarkdown(article);
    await copyToClipboard(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
    setTimeout(() => setOpen(false), 1500);
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        title="Export article"
        aria-label="Export article"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
          cursor: "pointer",
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 2v7M4.5 6.5L7 9l2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.5 10v1.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 120ms",
          }}
        >
          <path
            d="M2 3l2 2 2-2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            minWidth: 180,
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <button
            role="menuitem"
            onClick={() => handleCopy("html")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M4 2.5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V11"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <rect
                x="5"
                y="1.5"
                width="7"
                height="9"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </button>
          <div
            style={{
              height: 1,
              backgroundColor: "var(--border)",
              margin: "0 8px",
            }}
          />
          <button
            role="menuitem"
            onClick={() => handleCopy("markdown")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="1.5"
                y="2.5"
                width="11"
                height="9"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M4 9V5l1.5 2L7 5v4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 7.5V5L11 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {copied === "markdown" ? "Copied!" : "Copy Markdown"}
          </button>
        </div>
      )}
    </div>
  );
}
