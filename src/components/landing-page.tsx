'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/nav';
import ArticleCard from '@/components/article-card';
import IntakeForm from '@/components/intake-form';
import GenerationLoading from '@/components/generation-loading';
import { Toast, useToast } from '@/components/toast';
import type { Article, FeatureIntake } from '@/lib/types/article';

export default function LandingPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeMode, setIntakeMode] = useState<'new' | 'update'>('new');
  const [generating, setGenerating] = useState<{ title: string; module: string } | null>(null);
  const { toast, showToast } = useToast();

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My articles</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Update existing button */}
            <button
              onClick={() => { setIntakeMode('update'); setIntakeOpen(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                padding: '7px 14px',
                borderRadius: 'var(--radius)',
                transition: 'border-color 120ms ease, background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Pencil icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M10 1.5l2.5 2.5L4.5 12H2v-2.5L10 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 3l2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              Update existing
            </button>

            {/* New article button */}
            <button
              onClick={() => { setIntakeMode('new'); setIntakeOpen(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: 'var(--accent)',
                padding: '7px 16px',
                borderRadius: 'var(--radius)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent)';
              }}
            >
              + New article
            </button>
          </div>
        </div>

        {/* Intro text */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 28,
          }}
        >
          Click any article to continue working.
        </p>

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
            No articles yet. Click <strong>+ New article</strong> to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inProgress.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => router.push(`/editor/${article.id}`)}
                onDelete={async () => {
                  try {
                    const res = await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Delete failed');
                    fetchArticles();
                  } catch {
                    showToast('Failed to delete article');
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Completed section */}
        {!loading && completed.length > 0 && (
          <>
            <div
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
      </main>

      {/* Intake modal */}
      <IntakeForm
        isOpen={intakeOpen}
        initialMode={intakeMode}
        onClose={() => setIntakeOpen(false)}
        onGenerate={async (intake: FeatureIntake) => {
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
        }}
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
