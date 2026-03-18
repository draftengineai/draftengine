'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { FeatureFlags } from '@/lib/config/feature-flags';
import { DEFAULT_FLAGS, CORE_TOOLS_FLAGS, REVIEW_WORKFLOW_FLAGS } from '@/lib/config/feature-flags';
import { Toast, useToast } from '@/components/toast';

const FLAG_DESCRIPTIONS: Record<string, string> = {
  confidenceFlags: 'Amber confidence flags on steps',
  regenerate: 'Regenerate button in editor toolbar',
  deleteArticles: 'Delete button on article cards',
  reviewerNote: 'Reviewer note textarea in share modal',
  shareWithReviewer: 'Share link button in editor toolbar',
  updateExisting: 'Update existing articles action card and modal mode',
  approveWorkflow: 'Approve and Request revision buttons on preview page',
  updateIndicators: 'Teal change borders on updated steps',
  completedSection: 'Completed section on landing page',
  verifiedFacts: 'Inject verified facts into generation prompts',
};

interface Stats {
  totalArticles: number;
  byStatus: Record<string, number>;
  byModule: Record<string, number>;
  factsPerModule: Record<string, number>;
}

function FlagToggle({ flagKey, enabled, onToggle }: { flagKey: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {flagKey}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          {FLAG_DESCRIPTIONS[flagKey]}
        </div>
      </div>
      <button
        data-testid={`toggle-${flagKey}`}
        onClick={onToggle}
        aria-label={`Toggle ${flagKey}`}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: enabled ? '#7c3aed' : '#d1d5db',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 200ms ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: 3,
          left: enabled ? 23 : 3,
          transition: 'left 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [featuresRes, statsRes] = await Promise.all([
        fetch('/api/admin/features'),
        fetch('/api/admin/stats'),
      ]);
      if (featuresRes.ok) setFlags(await featuresRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      showToast('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveFlags = async (updated: FeatureFlags, message: string) => {
    const prev = flags;
    setFlags(updated);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(message);
    } catch {
      setFlags(prev);
      showToast('Failed to save');
    }
  };

  const handleToggle = async (key: keyof FeatureFlags) => {
    if (!flags) return;
    const updated = { ...flags, [key]: !flags[key] };
    await saveFlags(updated, `${key} ${updated[key] ? 'enabled' : 'disabled'}`);
  };

  const handleReset = async () => {
    await saveFlags({ ...DEFAULT_FLAGS }, 'All flags reset to defaults');
  };

  const handleEnableReviewWorkflow = async () => {
    if (!flags) return;
    const updated = { ...flags };
    for (const key of REVIEW_WORKFLOW_FLAGS) updated[key] = true;
    await saveFlags(updated, 'Review Workflow enabled');
  };

  const handleDisableReviewWorkflow = async () => {
    if (!flags) return;
    const updated = { ...flags };
    for (const key of REVIEW_WORKFLOW_FLAGS) updated[key] = false;
    await saveFlags(updated, 'Review Workflow disabled');
  };

  const handleEnableAll = async () => {
    if (!flags) return;
    const updated = { ...flags };
    for (const key of [...CORE_TOOLS_FLAGS, ...REVIEW_WORKFLOW_FLAGS]) updated[key] = true;
    await saveFlags(updated, 'All flags enabled');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', color: '#6b7280', paddingTop: 80 }}>
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>DraftEngine Admin</h1>
        </div>
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          Back to articles
        </Link>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Section 1: Feature Flags */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Feature Flags</h2>

          {flags && (
            <>
              {/* Core Tools group */}
              <div
                data-testid="group-core-tools"
                style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}
              >
                Core Tools
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {CORE_TOOLS_FLAGS.map((key) => (
                  <FlagToggle key={key} flagKey={key} enabled={flags[key]} onToggle={() => handleToggle(key)} />
                ))}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

              {/* Review Workflow group */}
              <div
                data-testid="group-review-workflow"
                style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}
              >
                Review Workflow
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {REVIEW_WORKFLOW_FLAGS.map((key) => (
                  <FlagToggle key={key} flagKey={key} enabled={flags[key]} onToggle={() => handleToggle(key)} />
                ))}
              </div>
            </>
          )}

          {/* Convenience buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            <button
              data-testid="enable-review-workflow-btn"
              onClick={handleEnableReviewWorkflow}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#7c3aed',
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Enable Review Workflow
            </button>
            <button
              data-testid="disable-review-workflow-btn"
              onClick={handleDisableReviewWorkflow}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#6b7280',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Disable Review Workflow
            </button>
            <button
              data-testid="enable-all-btn"
              onClick={handleEnableAll}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#059669',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Enable all
            </button>
            <button
              data-testid="reset-defaults-btn"
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#6b7280',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Reset to defaults
            </button>
          </div>
        </div>

        {/* Section 2: Stats */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Stats</h2>

          {stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Total */}
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Total articles</div>
                <div data-testid="total-articles" style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                  {stats.totalArticles}
                </div>
              </div>

              {/* By status */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>By status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600 }}>{count}</span>{' '}
                      <span style={{ color: '#6b7280' }}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By module */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>By module</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(stats.byModule).map(([mod, count]) => (
                    <div key={mod} style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600 }}>{count}</span>{' '}
                      <span style={{ color: '#6b7280' }}>{mod}</span>
                    </div>
                  ))}
                  {Object.keys(stats.byModule).length === 0 && (
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>No articles yet</span>
                  )}
                </div>
              </div>

              {/* Verified facts */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Verified facts per module</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(stats.factsPerModule).map(([mod, count]) => (
                    <div key={mod} style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600 }}>{count}</span>{' '}
                      <span style={{ color: '#6b7280' }}>{mod}</span>
                    </div>
                  ))}
                  {Object.keys(stats.factsPerModule).length === 0 && (
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>No verified facts yet</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Failed to load stats</div>
          )}
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} exiting={toast.exiting} />
    </div>
  );
}
