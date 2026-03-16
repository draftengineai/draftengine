"use client";

import React from "react";
import type { Article, ArticleType, ConfidenceFlag } from "@/lib/types/article";

interface EditorSidebarProps {
  article: Article;
  onTypeSwitch: (type: ArticleType) => void;
  dismissedFlags: Set<string>;
  onScrollToScreenshot?: () => void;
  onScrollToFlag?: () => void;
}

function getTypeLabel(t: ArticleType): string {
  return t === "howto" ? "How to" : "What's new";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "editing":
      return "Editing";
    case "generated":
      return "Generated";
    case "shared":
      return "Shared";
    case "approved":
      return "Approved";
    default:
      return status;
  }
}

function getStatusColor(status: string): { bg: string; color: string } {
  switch (status) {
    case "editing":
      return { bg: "var(--amber-light)", color: "var(--amber-dark)" };
    case "generated":
      return { bg: "var(--blue-light)", color: "var(--blue-dark)" };
    case "shared":
      return { bg: "var(--pink-light)", color: "var(--pink-dark)" };
    default:
      return { bg: "var(--bg-surface)", color: "var(--text-secondary)" };
  }
}

interface CheckItemProps {
  label: string;
  done: boolean;
  isCurrent: boolean;
  detail?: React.ReactNode;
  onClick?: () => void;
}

function CheckItem({ label, done, isCurrent, detail, onClick }: CheckItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: 10,
        backgroundColor: done ? "transparent" : "var(--bg-card)",
        border: `1px solid ${isCurrent ? "var(--accent)" : done ? "transparent" : "var(--border)"}`,
        borderRadius: 8,
        opacity: done ? 0.55 : 1,
        boxShadow: isCurrent ? "0 0 0 1px rgba(83,74,183,0.15)" : "none",
        cursor: onClick ? "pointer" : "default",
        marginBottom: 6,
        transition: "all 0.15s",
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${done ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--border)"}`,
          backgroundColor: done ? "var(--green)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5.5L4 7.5L8 3"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
        </div>
        {detail && <div style={{ marginTop: 2 }}>{detail}</div>}
      </div>
    </div>
  );
}

export default function EditorSidebar({
  article,
  onTypeSwitch,
  dismissedFlags,
  onScrollToScreenshot,
  onScrollToFlag,
}: EditorSidebarProps) {
  const statusStyle = getStatusColor(article.status);

  // Compute checklist states
  const textReviewed = article.status !== "generated";

  const activeType = article.activeType;
  const screenshotArr = article.screenshots[activeType] ?? [];
  const totalScreenshots = screenshotArr.length;
  const doneScreenshots = screenshotArr.filter((s) => s).length;
  const screenshotsDone = totalScreenshots > 0 && doneScreenshots === totalScreenshots;
  const hasScreenshots = activeType === "howto" && totalScreenshots > 0;

  const flags = article.confidence[activeType] ?? [];
  const remainingFlags = flags.filter((f, i): f is ConfidenceFlag => {
    if (f === null) return false;
    const key = `${article.id}-${activeType}-${i}`;
    return !dismissedFlags.has(key);
  }).length;
  const flagsDone = remainingFlags === 0;

  const sharedDone = article.status === "shared" || article.status === "approved";

  // Update-specific: "Review changes" item
  const isUpdateArticle = article.isUpdate && article.updatedSteps.length > 0;

  // Determine "current" item (first non-done)
  const items = [
    { done: textReviewed },
    ...(isUpdateArticle ? [{ done: false }] : []),
    ...(hasScreenshots ? [{ done: screenshotsDone }] : []),
    { done: flagsDone },
    { done: sharedDone },
  ];
  const currentIndex = items.findIndex((it) => !it.done);

  let checkIdx = 0;

  return (
    <div
      style={{
        width: 260,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Context zone */}
      <div style={{ padding: 16, borderBottom: "2px solid var(--border)" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 10,
            letterSpacing: "0.05em",
          }}
        >
          Article
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {article.types.map((t) => {
            const isActive = t === article.activeType;
            const tShots = article.screenshots[t] ?? [];
            const doneShots = tShots.filter(Boolean).length;
            const totalShots = tShots.length;
            const subtitle =
              t === "howto" && totalShots > 0
                ? `${doneShots}/${totalShots} screenshots`
                : "No screenshots";
            return (
              <button
                key={t}
                onClick={() => onTypeSwitch(t)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${isActive ? "rgba(97,87,137,0.15)" : "transparent"}`,
                  backgroundColor: isActive ? "var(--purple-light)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isActive ? "var(--text)" : "var(--text-secondary)",
                    }}
                  >
                    {getTypeLabel(t)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {subtitle}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 10,
                    flexShrink: 0,
                    backgroundColor: isActive ? "var(--accent)" : "var(--bg-surface)",
                    color: isActive ? "#FFFFFF" : "var(--text-tertiary)",
                  }}
                >
                  {isActive ? "Editing" : "View"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Metadata */}
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {article.writer && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Writer</span>
              <span style={{ fontWeight: 500 }}>{article.writer}</span>
            </div>
          )}
          {article.featureId && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Feature</span>
              {article.featureUrl ? (
                <a
                  href={article.featureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: 500,
                    color: "var(--accent)",
                    textDecoration: "underline",
                  }}
                >
                  {article.featureId}
                </a>
              ) : (
                <span style={{ fontWeight: 500 }}>{article.featureId}</span>
              )}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Status</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 8px",
                borderRadius: 20,
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
              }}
            >
              {getStatusLabel(article.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress zone */}
      <div
        style={{
          padding: 16,
          flex: 1,
          backgroundColor: "var(--bg-surface)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 10,
            letterSpacing: "0.05em",
          }}
        >
          What&apos;s left
        </div>

        {/* 1. Review text */}
        <CheckItem
          label="Review and edit text"
          done={textReviewed}
          isCurrent={currentIndex === checkIdx++}
          onClick={() => {
            document.querySelector("[data-article-overview]")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        {/* 1b. Review changes (update articles only) */}
        {isUpdateArticle && (
          <CheckItem
            label="Review changes"
            done={false}
            isCurrent={currentIndex === checkIdx++}
            detail={
              <span style={{ fontSize: 11, color: "#0d9488" }}>
                {article.updatedSteps.length} change{article.updatedSteps.length !== 1 ? "s" : ""}
              </span>
            }
            onClick={() => {
              const firstChanged = article.updatedSteps[0];
              document
                .querySelector(`[data-step="${firstChanged}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        )}

        {/* 2. Screenshots (howto only) */}
        {hasScreenshots && (
          <CheckItem
            label="Add screenshots"
            done={screenshotsDone}
            isCurrent={currentIndex === checkIdx++}
            onClick={onScrollToScreenshot}
            detail={
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {doneScreenshots}/{totalScreenshots}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${totalScreenshots > 0 ? (doneScreenshots / totalScreenshots) * 100 : 0}%`,
                      height: "100%",
                      backgroundColor: screenshotsDone ? "var(--green)" : "var(--accent)",
                      borderRadius: 2,
                      transition: "width 200ms ease",
                    }}
                  />
                </div>
              </div>
            }
          />
        )}

        {/* 3. Review flags */}
        <CheckItem
          label="Review flags"
          done={flagsDone}
          isCurrent={currentIndex === checkIdx++}
          onClick={onScrollToFlag}
          detail={
            !flagsDone ? (
              <span style={{ fontSize: 11, color: "var(--amber)" }}>
                {remainingFlags} remaining
              </span>
            ) : undefined
          }
        />

        {/* 4. Share */}
        <CheckItem
          label="Share with Steward"
          done={sharedDone}
          isCurrent={currentIndex === checkIdx}
        />
      </div>
    </div>
  );
}
