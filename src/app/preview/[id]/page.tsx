"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/nav";
import type { Article } from "@/lib/types/article";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/articles/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json();
      })
      .then((data: Article) => setArticle(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Nav userName="Steward" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 52px)",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          Loading preview...
        </div>
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Nav userName="Steward" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 52px)",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          {error ?? "Article not found"}
        </div>
      </>
    );
  }

  const activeContent =
    article.activeType === "howto"
      ? article.content.howto
      : article.content.wn;

  return (
    <>
      <style>{`
        @media print {
          .preview-banner,
          .steward-note-banner {
            display: none !important;
          }
        }
      `}</style>

      <Nav userName="Steward" />

      {/* Shared preview banner */}
      <div
        className="preview-banner"
        style={{
          backgroundColor: "var(--blue)",
          color: "#FFFFFF",
          textAlign: "center",
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        Shared preview — read-only
      </div>

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        {/* Steward note */}
        {article.reviewNote && (
          <div
            className="steward-note-banner"
            style={{
              backgroundColor: "var(--teal-light, #e0f5f0)",
              border: "1px solid var(--teal, #2da887)",
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: "var(--teal-dark, #1a6b56)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontWeight: 600 }}>Writer&apos;s note:</strong>{" "}
            {article.reviewNote}
          </div>
        )}

        {/* Article canvas — read-only inline render */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 40px",
          }}
        >
          {/* Title */}
          {article.activeType === "wn" && (
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 0,
              }}
            >
              WHAT&apos;S NEW?
            </div>
          )}
          <h1
            style={{
              fontSize: article.activeType === "wn" ? 18 : 22,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 4,
              marginTop: article.activeType === "wn" ? 2 : 0,
            }}
          >
            {article.title}
          </h1>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 24,
              display: "flex",
              gap: 12,
            }}
          >
            <span>Module: {article.module}</span>
            <span>
              Type:{" "}
              {article.activeType === "howto" ? "How To" : "What's New"}
            </span>
          </div>

          {/* How To content */}
          {article.activeType === "howto" && article.content.howto && (
            <div>
              {/* Overview */}
              <div style={{ marginBottom: 24 }}>
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  Overview
                </h2>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--text)",
                  }}
                  dangerouslySetInnerHTML={{ __html: article.content.howto.overview }}
                />
              </div>

              {/* Steps */}
              {article.content.howto.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 24,
                    paddingBottom: 24,
                    borderBottom:
                      i < article.content.howto!.steps.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    {step.heading}
                  </h3>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--text)",
                    }}
                    dangerouslySetInnerHTML={{ __html: step.text }}
                  />
                  {step.imgPath && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: "var(--radius)",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <img
                        src={step.imgPath}
                        alt={step.imgDesc || `Step ${i + 1} screenshot`}
                        style={{
                          display: "block",
                          maxWidth: "100%",
                          height: "auto",
                        }}
                      />
                    </div>
                  )}
                  {!step.imgPath && step.imgDesc && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "16px",
                        backgroundColor: "var(--bg-surface)",
                        borderRadius: "var(--radius)",
                        border: "1px dashed var(--border)",
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        textAlign: "center",
                      }}
                    >
                      Screenshot placeholder: {step.imgDesc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* What's New content */}
          {article.activeType === "wn" && article.content.wn && (
            <div>
              {[
                { label: "Overview", text: article.content.wn.overview },
                {
                  label: "Introduction",
                  text: article.content.wn.introduction,
                },
                {
                  label: "Where to Find",
                  text: article.content.wn.whereToFind,
                },
                { label: "Closing", text: article.content.wn.closing },
              ].map(
                (section) =>
                  section.text && (
                    <div key={section.label} style={{ marginBottom: 24 }}>
                      <h2
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--text)",
                          marginBottom: 8,
                        }}
                      >
                        {section.label}
                      </h2>
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "var(--text)",
                        }}
                        dangerouslySetInnerHTML={{ __html: section.text }}
                      />
                    </div>
                  )
              )}
            </div>
          )}

          {/* Empty state */}
          {!activeContent && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 14,
              }}
            >
              No content generated yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
