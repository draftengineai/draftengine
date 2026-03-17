"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Article, ArticleType, ChangeType, ConfidenceFlag } from "@/lib/types/article";
import Nav from "@/components/nav";
import EditorSidebar from "@/components/editor-sidebar";
import ArticleCanvas from "@/components/article-canvas";
import FormatToolbar from "@/components/format-toolbar";
import RegenerateModal from "@/components/regenerate-modal";
import GenerationLoading from "@/components/generation-loading";
import ShareModal from "@/components/share-modal";
import { useFeatures } from "@/lib/hooks/useFeatures";

function getTypeLabel(t: ArticleType): string {
  return t === "howto" ? "How to" : "What's new";
}

function getInfoBanner(article: Article, dismissedFlags: Set<string>): {
  bg: string;
  color: string;
  text: string;
} | null {
  const activeType = article.activeType;
  const screenshotArr = article.screenshots[activeType] ?? [];
  const missingScreenshots = screenshotArr.filter((s) => !s).length;

  const flags = article.confidence[activeType] ?? [];
  const remainingFlags = flags.filter((f, i): f is ConfidenceFlag => {
    if (f === null) return false;
    const key = `${article.id}-${activeType}-${i}`;
    return !dismissedFlags.has(key);
  }).length;

  if (article.status === "generated") {
    return {
      bg: "var(--blue-light)",
      color: "var(--blue-dark)",
      text: "New AI draft. Review text, add screenshots, check amber flags.",
    };
  }

  if (article.status === "editing") {
    if (missingScreenshots > 0) {
      return {
        bg: "var(--amber-light)",
        color: "var(--amber-dark)",
        text: `${missingScreenshots} screenshot${missingScreenshots !== 1 ? "s" : ""}. Click any blue dashed area.`,
      };
    }
    if (remainingFlags > 0) {
      return {
        bg: "var(--amber-light)",
        color: "var(--amber-dark)",
        text: `${remainingFlags} flag${remainingFlags !== 1 ? "s" : ""}. Review and dismiss after verifying.`,
      };
    }
    return {
      bg: "var(--green-light)",
      color: "var(--green-dark)",
      text: "Looks complete. Click Share link.",
    };
  }

  if (article.status === "shared") {
    return {
      bg: "var(--pink-light)",
      color: "var(--pink-dark)",
      text: "Shared. Print when approved.",
    };
  }

  return null;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedFlags, setDismissedFlags] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { features } = useFeatures();

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) throw new Error("Article not found");
        const data = await res.json();
        console.log('[Editor] Article loaded:', JSON.stringify(data, null, 2)); // TODO: remove debug log
        setArticle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load article");
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [id]);

  const handleArticleChange = useCallback((updated: Article) => {
    setArticle(updated);
  }, []);

  const handleTypeSwitch = useCallback(
    (type: ArticleType) => {
      if (!article) return;
      setArticle({ ...article, activeType: type });
    },
    [article]
  );

  const handleRegenerateSubmit = useCallback(
    async (data: {
      title: string;
      module: string;
      changeType: ChangeType;
      description: string;
      additionalGuidance: string;
    }) => {
      if (!article) return;
      setRegenerating(true);
      try {
        // Build description with optional guidance prepended
        const fullDescription = data.additionalGuidance
          ? `[Writer guidance: ${data.additionalGuidance}]\n\n${data.description}`
          : data.description;

        const intake = {
          title: data.title,
          module: data.module,
          changeType: data.changeType,
          description: fullDescription,
          behaviorRulesLinks: [],
          userStories: [],
          generateHowTo: article.types.includes('howto'),
          generateWhatsNew: article.types.includes('wn'),
          isUpdate: false,
          targetArticleIds: [],
        };

        const res = await fetch('/api/generate?skipPersist=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intake),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Regeneration failed');
        }

        const newArticle: Article = await res.json();

        // Update the existing article with the new content via PATCH
        const patchRes = await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            module: data.module,
            changeType: data.changeType,
            description: data.description,
            content: newArticle.content,
            confidence: newArticle.confidence,
            screenshots: newArticle.screenshots,
            status: 'generated',
            updatedAt: new Date().toISOString(),
          }),
        });

        if (!patchRes.ok) {
          throw new Error('Failed to save regenerated content');
        }

        const updatedArticle = await patchRes.json();
        setArticle(updatedArticle);
        setDismissedFlags(new Set());
        setShowRegenModal(false);
      } catch (err) {
        console.error('[Regenerate] Error:', err);
        alert(err instanceof Error ? err.message : 'Regeneration failed');
      } finally {
        setRegenerating(false);
      }
    },
    [article],
  );

  const handleWriteManually = useCallback(() => {
    if (!article) return;
    const updated = { ...article };
    if (article.activeType === 'howto') {
      const howto = updated.content.howto ?? { overview: '', steps: [] };
      // Clear insufficient context from overview if present
      const cleanOverview = howto.overview.toLowerCase().includes('insufficient context')
        ? ''
        : howto.overview;
      // Add empty step templates if no steps exist
      const steps = howto.steps.length > 0 ? howto.steps : [
        { heading: 'Step 1', text: '', imgDesc: '', imgPath: null },
        { heading: 'Step 2', text: '', imgDesc: '', imgPath: null },
        { heading: 'Step 3', text: '', imgDesc: '', imgPath: null },
      ];
      updated.content = {
        ...updated.content,
        howto: { overview: cleanOverview, steps },
      };
    } else if (article.activeType === 'wn') {
      const wn = updated.content.wn ?? { overview: '', introduction: '', whereToFind: '', closing: '' };
      const cleanOverview = wn.overview.toLowerCase().includes('insufficient context')
        ? ''
        : wn.overview;
      updated.content = {
        ...updated.content,
        wn: { ...wn, overview: cleanOverview },
      };
    }
    setArticle(updated);
  }, [article]);

  const handleScrollToScreenshot = useCallback(() => {
    if (!article) return;
    const screenshots = article.screenshots[article.activeType] ?? [];
    const idx = screenshots.findIndex((s) => !s);
    if (idx >= 0) {
      document.querySelector(`[data-screenshot-slot="${idx}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [article]);

  const handleScrollToFlag = useCallback(() => {
    if (!article) return;
    const flags = article.confidence[article.activeType] ?? [];
    const idx = flags.findIndex((f, i) => {
      if (f === null) return false;
      const key = `${article.id}-${article.activeType}-${i}`;
      return !dismissedFlags.has(key);
    });
    if (idx >= 0) {
      document.querySelector(`[data-step="${idx}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [article, dismissedFlags]);

  const handleFlagDismiss = useCallback(
    async (stepIndex: number) => {
      if (!article) return;
      const activeType = article.activeType;

      // Null out the flag in the confidence array
      const flags = [...(article.confidence[activeType] ?? [])];
      flags[stepIndex] = null;
      const updatedConfidence = { ...article.confidence, [activeType]: flags };

      // Update local state immediately for responsive UI
      const updatedArticle = { ...article, confidence: updatedConfidence };
      setArticle(updatedArticle);

      // Also update dismissedFlags Set for sidebar/banner compatibility
      const key = `${article.id}-${activeType}-${stepIndex}`;
      setDismissedFlags((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      // Persist to store via PATCH
      try {
        await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confidence: updatedConfidence }),
        });
      } catch (err) {
        console.error('[FlagDismiss] Failed to persist:', err);
      }
    },
    [article]
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Nav userName="Writer" showBack onBack={() => router.push("/")} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 52px)",
            color: "var(--text-tertiary)",
            fontSize: 14,
          }}
        >
          Loading article...
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Nav userName="Writer" showBack onBack={() => router.push("/")} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 52px)",
            color: "var(--red)",
            fontSize: 14,
          }}
        >
          {error ?? "Article not found"}
        </div>
      </div>
    );
  }

  const banner = getInfoBanner(article, dismissedFlags);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav
        userName={article.writer ?? "Writer"}
        showBack
        onBack={() => router.push("/")}
      />

      {/* Revision banner */}
      {article.status === "revision" && article.revisionReason && (
        <div
          data-testid="revision-banner"
          data-print-hide
          style={{
            backgroundColor: "#fef3c7",
            color: "#92400e",
            padding: "10px 24px",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Revision requested by Steward: {article.revisionReason}
        </div>
      )}

      {/* Info banner */}
      {banner && (
        <div
          data-info-banner
          data-print-hide
          style={{
            backgroundColor: banner.bg,
            color: banner.color,
            padding: "8px 24px",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {banner.text}
        </div>
      )}

      {/* Main layout */}
      <div
        data-editor-layout
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Sidebar */}
        <div data-sidebar data-print-hide>
        <EditorSidebar
          article={article}
          onTypeSwitch={handleTypeSwitch}
          dismissedFlags={dismissedFlags}
          onScrollToScreenshot={handleScrollToScreenshot}
          onScrollToFlag={handleScrollToFlag}
        />
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Editor toolbar */}
          <div
            data-toolbar
            data-print-hide
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 24px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {article.title}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  backgroundColor: "var(--purple-bg)",
                  color: "var(--purple-dark)",
                }}
              >
                {getTypeLabel(article.activeType)}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Regenerate button */}
              {features.regenerate && <button
                data-testid="regenerate-btn"
                title="Regenerate article with updated details"
                aria-label="Regenerate article"
                onClick={() => setShowRegenModal(true)}
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
                    d="M1.5 7a5.5 5.5 0 0 1 9.37-3.9"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12.5 7a5.5 5.5 0 0 1-9.37 3.9"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.5 1v2.5H8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.5 13v-2.5H6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Regenerate
              </button>}

              {/* Share link button */}
              {features.shareWithSteward && <button
                title="Share link with Steward"
                aria-label="Share link with Steward"
                onClick={() => setShowShareModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--accent)",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--purple-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5.5 8.5L8.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 5H4.5A2.5 2.5 0 0 0 4.5 10H6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 9h1.5a2.5 2.5 0 0 0 0-5H8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Share link
              </button>}

              {/* Print button */}
              <button
                title="Print article"
                aria-label="Print article"
                onClick={() => window.print()}
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
                  <rect
                    x="3.5"
                    y="5"
                    width="7"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M4.5 5V2.5h5V5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M5.5 8.5h3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M2 6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
                Print
              </button>
            </div>
          </div>

          {/* Format toolbar */}
          <div data-format-toolbar data-print-hide>
            <FormatToolbar />
          </div>

          {/* Scrollable canvas area */}
          <div
            data-editor-scroll
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "var(--bg-surface)",
              padding: "28px 24px",
            }}
          >
            <ArticleCanvas
              article={article}
              onArticleChange={handleArticleChange}
              dismissedFlags={dismissedFlags}
              onWriteManually={handleWriteManually}
              onFlagDismiss={handleFlagDismiss}
              showConfidenceFlags={features.confidenceFlags}
              showUpdateIndicators={features.updateIndicators}
            />
          </div>
        </div>
      </div>

      {/* Regenerate modal */}
      <RegenerateModal
        isOpen={showRegenModal}
        onClose={() => setShowRegenModal(false)}
        onRegenerate={handleRegenerateSubmit}
        initialTitle={article.title}
        initialModule={article.module}
        initialChangeType={article.changeType as ChangeType}
        initialDescription={article.description || ''}
        regenerating={regenerating}
      />

      {/* Regeneration loading overlay */}
      {regenerating && (
        <GenerationLoading title={article.title} module={article.module} />
      )}

      {/* Share modal */}
      <ShareModal
        isOpen={showShareModal}
        articleId={article.id}
        onClose={() => setShowShareModal(false)}
        onShare={() => {
          setShowShareModal(false);
          setArticle((prev) => prev ? { ...prev, status: "shared" } : prev);
        }}
        showStewardNote={features.stewardNote}
      />
    </div>
  );
}
