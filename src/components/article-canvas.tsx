"use client";

import React, { useRef, useEffect } from "react";
import type { Article, Step, ConfidenceFlag } from "@/lib/types/article";
import { sanitizeHTML } from "@/lib/sanitize";
import StepEditor from "./step-editor";

interface ArticleCanvasProps {
  article: Article;
  onArticleChange: (updated: Article) => void;
  readOnly?: boolean;
  dismissedFlags?: Set<string>;
  onWriteManually?: () => void;
  onFlagDismiss?: (stepIndex: number) => void;
  showConfidenceFlags?: boolean;
  showUpdateIndicators?: boolean;
}

function EditableSection({
  label,
  hint,
  html,
  onChange,
  readOnly,
}: {
  label: string;
  hint?: string;
  html: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Set initial content only once; let the browser handle editing natively
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = sanitizeHTML(html);
    }
    // Only run on mount or when html changes externally (not during typing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        marginBottom: 20,
      }}
    >
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
          {label}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "var(--purple)",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        style={{
          padding: 16,
          fontSize: 14,
          lineHeight: 1.7,
          outline: "none",
          minHeight: 60,
        }}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(55,138,221,0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          if (ref.current) {
            onChange(ref.current.innerHTML);
          }
        }}
      />
    </div>
  );
}

export default function ArticleCanvas({
  article,
  onArticleChange,
  readOnly,
  dismissedFlags,
  onWriteManually,
  onFlagDismiss,
  showConfidenceFlags = true,
  showUpdateIndicators = true,
}: ArticleCanvasProps) {
  const activeType = article.activeType;

  const handleOverviewChange = (val: string) => {
    const content = { ...article.content };
    if (activeType === "howto" && content.howto) {
      content.howto = { ...content.howto, overview: val };
    } else if (activeType === "wn" && content.wn) {
      content.wn = { ...content.wn, overview: val };
    }
    onArticleChange({ ...article, content });
  };

  const handleStepChange = (index: number, updated: Step) => {
    if (activeType !== "howto" || !article.content.howto) return;
    const steps = [...article.content.howto.steps];
    steps[index] = updated;
    onArticleChange({
      ...article,
      content: {
        ...article.content,
        howto: { ...article.content.howto, steps },
      },
    });
  };

  const handleScreenshotToggle = (index: number) => {
    const screenshots = { ...article.screenshots };
    const arr = [...(screenshots[activeType] ?? [])];
    arr[index] = !arr[index];
    screenshots[activeType] = arr;
    onArticleChange({ ...article, screenshots });
  };

  const handleFlagDismiss = (index: number) => {
    if (onFlagDismiss) onFlagDismiss(index);
  };

  const getFlag = (index: number): ConfidenceFlag | null => {
    const flags = article.confidence[activeType] ?? [];
    const flag = flags[index] ?? null;
    if (!flag) return null;
    const key = `${article.id}-${activeType}-${index}`;
    if (dismissedFlags?.has(key)) return null;
    return flag;
  };

  const overviewRef = useRef<HTMLDivElement>(null);

  const overview =
    activeType === "howto"
      ? article.content.howto?.overview ?? ""
      : article.content.wn?.overview ?? "";

  // Set overview content only when article data changes externally (not during typing)
  useEffect(() => {
    if (overviewRef.current && overviewRef.current.innerHTML !== overview) {
      overviewRef.current.innerHTML = sanitizeHTML(overview);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  // Detect empty content: the article was generated but parsing returned no usable content
  const hasNoContent =
    activeType === "howto"
      ? !article.content.howto ||
        (article.content.howto.steps.length === 0 &&
          !article.content.howto.overview)
      : activeType === "wn"
        ? !article.content.wn ||
          (!article.content.wn.introduction &&
            !article.content.wn.whereToFind &&
            !article.content.wn.closing &&
            !article.content.wn.overview)
        : false;

  // Detect thin content: overview mentions "insufficient context" or steps array is empty
  const hasThinContent =
    !hasNoContent &&
    (overview.toLowerCase().includes("insufficient context") ||
      (activeType === "howto" &&
        article.content.howto !== undefined &&
        article.content.howto.steps.length === 0));

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "28px 32px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* What's New header — only for WN articles */}
      {activeType === "wn" && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 8,
            letterSpacing: "-0.3px",
          }}
        >
          WHAT&apos;S NEW?
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {article.title}
          </div>
        </div>
      )}

      {/* Update banner */}
      {showUpdateIndicators && article.isUpdate && article.updateReason && (
        <div
          data-testid="update-banner"
          style={{
            backgroundColor: "rgba(13,148,136,0.10)",
            border: "1px solid rgba(13,148,136,0.25)",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#0d9488",
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          <div>
            This article was updated based on: {article.updateReason}
          </div>
          {article.updatedSteps.length > 0 &&
            activeType === "howto" &&
            article.content.howto && (
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 400 }}>
                {article.updatedSteps.length} of{" "}
                {article.content.howto.steps.length} steps were revised
              </div>
            )}
        </div>
      )}

      {/* Overview */}
      <div
        data-article-overview
        style={{
          backgroundColor: "var(--purple-light)",
          color: "var(--purple)",
          padding: "12px 16px",
          borderRadius: 8,
          fontStyle: "italic",
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        <div
          ref={overviewRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          role="textbox"
          aria-label="Article overview"
          aria-multiline="true"
          onBlur={() => {
            if (overviewRef.current) {
              handleOverviewChange(overviewRef.current.innerHTML);
            }
          }}
          style={{ outline: "none" }}
        />
      </div>

      {/* Thin content recovery banner */}
      {hasThinContent && !readOnly && (
        <div
          data-testid="thin-content-banner"
          style={{
            padding: "24px",
            border: "2px solid var(--amber)",
            borderRadius: 12,
            backgroundColor: "var(--amber-light)",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              margin: "0 auto 12px",
              borderRadius: "50%",
              backgroundColor: "var(--amber)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            The AI didn&apos;t have enough context to generate complete content.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 440,
              margin: "0 auto 16px",
              lineHeight: 1.5,
            }}
          >
            Click <strong>Regenerate</strong> in the toolbar to try again with
            more detail, or edit manually below.
          </p>
          {onWriteManually && (
            <button
              data-testid="write-manually-btn"
              onClick={onWriteManually}
              style={{
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: "transparent",
                color: "var(--text)",
                borderRadius: 8,
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              Write manually
            </button>
          )}
        </div>
      )}

      {activeType === "howto" && article.content.howto && article.content.howto.steps.length > 0 && (
        <>
          {article.content.howto.steps.map((step, i) => (
            <StepEditor
              key={i}
              step={step}
              index={i}
              totalSteps={article.content.howto!.steps.length}
              flag={showConfidenceFlags ? getFlag(i) : null}
              screenshotFilled={article.screenshots[activeType]?.[i] ?? false}
              onStepChange={handleStepChange}
              onScreenshotToggle={handleScreenshotToggle}
              onFlagDismiss={handleFlagDismiss}
              readOnly={readOnly}
              isChanged={showUpdateIndicators && article.isUpdate && article.updatedSteps.includes(i)}
              originalText={showUpdateIndicators ? article.originals[i] : undefined}
            />
          ))}
        </>
      )}

      {activeType === "wn" && article.content.wn && (article.content.wn.introduction || article.content.wn.whereToFind || article.content.wn.closing) && (
        <>
          <EditableSection
            label="Introduction"
            hint="No bold"
            html={article.content.wn.introduction}
            onChange={(val) => {
              onArticleChange({
                ...article,
                content: {
                  ...article.content,
                  wn: { ...article.content.wn!, introduction: val },
                },
              });
            }}
            readOnly={readOnly}
          />
          <EditableSection
            label="Where to Find It"
            hint="Bold UI elements"
            html={article.content.wn.whereToFind}
            onChange={(val) => {
              onArticleChange({
                ...article,
                content: {
                  ...article.content,
                  wn: { ...article.content.wn!, whereToFind: val },
                },
              });
            }}
            readOnly={readOnly}
          />
          <EditableSection
            label="Closing"
            html={article.content.wn.closing}
            onChange={(val) => {
              onArticleChange({
                ...article,
                content: {
                  ...article.content,
                  wn: { ...article.content.wn!, closing: val },
                },
              });
            }}
            readOnly={readOnly}
          />
        </>
      )}

      {/* Empty content error state */}
      {hasNoContent && (
        <div
          style={{
            padding: "32px 24px",
            textAlign: "center",
            border: "2px dashed var(--border)",
            borderRadius: 12,
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: "50%",
              backgroundColor: "var(--amber-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            !
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Article content failed to generate
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 400,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            The AI response could not be parsed into article content. Try
            generating a new article or check the browser console and server
            logs for details.
          </p>
        </div>
      )}
    </div>
  );
}
