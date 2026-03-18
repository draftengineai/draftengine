'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/nav';
import ArticleCard from '@/components/article-card';
import IntakeForm from '@/components/intake-form';
import GenerationLoading from '@/components/generation-loading';
import { Toast, useToast } from '@/components/toast';
import KanbanBoard from '@/components/kanban-board';
import { useFeatures } from '@/lib/hooks/useFeatures';
import type { Article, ArticleStatus, FeatureIntake } from '@/lib/types/article';

export default function LandingPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeMode, setIntakeMode] = useState<'new' | 'update'>('new');
  const [generating, setGenerating] = useState<{ title: string; module: string } | null>(null);
  const { toast, showToast } = useToast();
  const { features } = useFeatures();
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('draftengine_view') as 'list' | 'board') || 'list';
    }
    return 'list';
  });

  const handleViewChange = (mode: 'list' | 'board') => {
    setViewMode(mode);
    localStorage.setItem('draftengine_view', mode);
  };

  const handlePriorityUpdate = async (articleId: string, newPriority: number) => {
    try {
      await fetch(`/api/articles/${articleId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
    } catch {
      // silently fail — optimistic update already applied
    }
  };

  const handleStatusChange = async (articleId: string, newStatus: ArticleStatus) => {
    try {
      await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchArticles();
    } catch {
      showToast('Failed to update article status');
    }
  };

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch {
      // silently fail for now
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const inProgress = articles
    .filter((a) => a.status !== 'approved')
    .sort((a, b) => {
      // Revision articles sort to top (highest priority for the writer)
      if (a.status === 'revision' && b.status !== 'revision') return -1;
      if (a.status !== 'revision' && b.status === 'revision') return 1;
      // Updated articles sort to top
      if (a.isUpdate && !b.isUpdate) return -1;
      if (!a.isUpdate && b.isUpdate) return 1;
      // Within same group, most recently updated first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const completed = articles
    .filter((a) => a.status === 'approved')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const revisionArticles = articles.filter((a) => a.status === 'revision');
  const hasArticles = articles.length > 0;
  const isEmpty = !loading && !hasArticles;

  const handleGenerate = async (intake: FeatureIntake) => {
    setIntakeOpen(false);
    setGenerating({ title: intake.title, module: intake.module });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intake),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const article = await res.json();
      router.push(`/editor/${article.id}`);
    } catch (err) {
      setGenerating(null);
      showToast(
        err instanceof Error ? err.message : 'Failed to generate articles'
      );
    }
  };

  // STATE A — Empty (no articles): Welcome card
  if (isEmpty) {
    return (
      <>
        <Nav userName="Writer" />
        <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
          <div
            data-testid="welcome-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 32px',
              textAlign: 'center',
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            {/* DraftEngine icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--purple-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--accent)" opacity="0.2" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 8,
            }}>
              Generate your first article
            </h1>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              maxWidth: 380,
              lineHeight: 1.6,
              marginBottom: 28,
            }}>
              Paste a feature spec and DraftEngine will draft a How To and What&apos;s New article following your writing standards.
            </p>
            <button
              data-testid="get-started-btn"
              onClick={() => { setIntakeMode('new'); setIntakeOpen(true); }}
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: 'var(--accent)',
                padding: '12px 32px',
                borderRadius: 'var(--radius)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent)';
              }}
            >
              Get started
            </button>
          </div>
        </main>

        <IntakeForm
          isOpen={intakeOpen}
          initialMode={intakeMode}
          onClose={() => setIntakeOpen(false)}
          onGenerate={handleGenerate}
          onUpdate={(firstArticleId: string) => {
            setIntakeOpen(false);
            fetchArticles();
            router.push(`/editor/${firstArticleId}`);
          }}
        />

        {generating && (
          <GenerationLoading title={generating.title} module={generating.module} />
        )}

        <Toast message={toast.message} visible={toast.visible} exiting={toast.exiting} />
      </>
    );
  }

  // STATE B — Has articles
  return (
    <>
      <Nav userName="Writer" />

      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My articles</h1>
          {/* View toggle */}
          <div data-testid="view-toggle" style={{ display: 'flex', gap: 2, background: 'var(--bg-surface)', borderRadius: 8, padding: 2 }}>
            <button
              data-testid="view-list"
              onClick={() => handleViewChange('list')}
              aria-label="List view"
              style={{
                width: 32,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text)' : 'var(--text-tertiary)',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              data-testid="view-board"
              onClick={() => handleViewChange('board')}
              aria-label="Board view"
              style={{
                width: 32,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: viewMode === 'board' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'board' ? 'var(--text)' : 'var(--text-tertiary)',
                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="6.25" y="2" width="3.5" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="11" y="2" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Cards */}
        {!loading && hasArticles && (
          <div
            data-testid="action-cards"
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 28,
            }}
          >
            {/* Card 1: Generate a new article (always visible) */}
            <button
              data-testid="action-card-new"
              onClick={() => { setIntakeMode('new'); setIntakeOpen(true); }}
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'box-shadow 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Generate a new article
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Paste a feature spec and get a draft article
              </div>
            </button>

            {/* Card 2: Update existing articles (conditional) */}
            {features.updateExisting && articles.length > 0 && (
              <button
                data-testid="action-card-update"
                onClick={() => { setIntakeMode('update'); setIntakeOpen(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'box-shadow 120ms ease, border-color 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 2.5a2 2 0 00-2.83 0L4 9.17V12h2.83l6.67-6.67a2 2 0 000-2.83z" stroke="var(--teal)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 3.5l2.5 2.5" stroke="var(--teal)" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    Update existing articles
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Describe what changed and revise affected articles
                </div>
              </button>
            )}

            {/* Card 3: Articles need attention (conditional) */}
            {revisionArticles.length > 0 && (
              <button
                data-testid="action-card-attention"
                onClick={() => {
                  const el = document.querySelector('[data-revision-article]');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{
                  flex: 1,
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'box-shadow 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5L1 14h14L8 1.5z" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 6v3" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="8" cy="11.5" r="0.5" fill="#d97706" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#9a3412' }}>
                    Articles need attention
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#c2410c', lineHeight: 1.4 }}>
                  {revisionArticles.length} article{revisionArticles.length !== 1 ? 's' : ''} need{revisionArticles.length === 1 ? 's' : ''} revision
                </div>
              </button>
            )}
          </div>
        )}

        {/* Kanban board view */}
        {viewMode === 'board' ? (
          !loading && (
            <KanbanBoard
              articles={articles}
              onCardClick={(id) => router.push(`/editor/${id}`)}
              onReorder={handlePriorityUpdate}
              onStatusChange={handleStatusChange}
            />
          )
        ) : (
          <>
            {/* In Progress section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                In progress
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '1px 7px',
                  borderRadius: 10,
                }}
              >
                {loading ? '...' : inProgress.length}
              </span>
            </div>

            {/* Article list */}
            {loading ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 14,
                }}
              >
                Loading articles...
              </div>
            ) : inProgress.length === 0 ? (
              <div
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 14,
                }}
              >
                No in-progress articles. All articles are approved.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inProgress.map((article) => (
                  <div
                    key={article.id}
                    data-revision-article={article.status === 'revision' ? 'true' : undefined}
                  >
                    <ArticleCard
                      article={article}
                      onClick={() => router.push(`/editor/${article.id}`)}
                      onDelete={features.deleteArticles ? async () => {
                        try {
                          const res = await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Delete failed');
                          fetchArticles();
                        } catch {
                          showToast('Failed to delete article');
                        }
                      } : undefined}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Completed section */}
            {!loading && completed.length > 0 && features.completedSection && (
              <>
                <div
                  data-testid="completed-section"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 32,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Completed
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '1px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {completed.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {completed.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onClick={() => router.push(`/editor/${article.id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Intake modal */}
      <IntakeForm
        isOpen={intakeOpen}
        initialMode={intakeMode}
        onClose={() => setIntakeOpen(false)}
        onGenerate={handleGenerate}
        onUpdate={(firstArticleId: string) => {
          setIntakeOpen(false);
          fetchArticles();
          router.push(`/editor/${firstArticleId}`);
        }}
      />

      {/* Generation loading screen */}
      {generating && (
        <GenerationLoading title={generating.title} module={generating.module} />
      )}

      {/* Toast */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        exiting={toast.exiting}
      />
    </>
  );
}
