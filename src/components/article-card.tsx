'use client';

import { Article, ArticleType, ConfidenceFlag } from '@/lib/types/article';

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
  onDelete?: () => void;
}

function getNextAction(article: Article): string {
  if (article.status === 'generated') return 'Start editing';

  if (article.status === 'editing') {
    // Count missing screenshots
    const screenshotEntries = article.screenshots[article.activeType] ?? [];
    const missingScreenshots = screenshotEntries.filter((s) => !s).length;
    if (missingScreenshots > 0) {
      return `${missingScreenshots} screenshot${missingScreenshots > 1 ? 's' : ''}`;
    }

    // Count active confidence flags (non-null)
    const flags = article.confidence[article.activeType] ?? [];
    const activeFlags = flags.filter((f): f is ConfidenceFlag => f !== null).length;
    if (activeFlags > 0) {
      return `${activeFlags} flag${activeFlags > 1 ? 's' : ''}`;
    }

    if (article.status === 'editing') return 'Ready to share';
  }

  if (article.status === 'shared') return 'Awaiting review';
  if (article.status === 'approved') return 'Approved';
  if (article.status === 'revision') return 'Needs revision';

  return 'Start editing';
}

function getAIProgressLine(article: Article): { color: string; text: string } {
  if (article.isUpdate) {
    return {
      color: 'var(--teal)',
      text: `Bug fix — ${article.updatedSteps.length} step${article.updatedSteps.length !== 1 ? 's' : ''} revised`,
    };
  }

  const screenshotEntries = article.screenshots[article.activeType] ?? [];
  const totalScreenshots = screenshotEntries.length;
  const doneScreenshots = screenshotEntries.filter((s) => s).length;

  switch (article.status) {
    case 'generated':
      return { color: 'var(--blue)', text: 'AI draft — not yet reviewed' };
    case 'editing':
      return {
        color: 'var(--amber)',
        text: `AI-generated — ${doneScreenshots}/${totalScreenshots} screenshots, editing`,
      };
    case 'shared':
      return { color: 'var(--pink)', text: 'Reviewed and shared' };
    case 'approved':
      return { color: '#16a34a', text: 'Approved — verified facts extracted' };
    case 'revision':
      return { color: '#d97706', text: 'Revision requested by Steward' };
    default:
      return { color: 'var(--blue)', text: 'AI draft — not yet reviewed' };
  }
}

function getTypeLabel(t: ArticleType): string {
  return t === 'howto' ? 'How to' : "What's new";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'editing':
      return 'Editing';
    case 'generated':
      return 'Generated';
    case 'shared':
      return 'Shared';
    case 'approved':
      return 'Approved';
    case 'revision':
      return 'Revision';
    default:
      return status;
  }
}

function getStatusColor(status: string): { bg: string; color: string } {
  switch (status) {
    case 'editing':
      return { bg: 'var(--amber-light)', color: 'var(--amber-dark)' };
    case 'generated':
      return { bg: 'var(--blue-light)', color: 'var(--blue-dark)' };
    case 'shared':
      return { bg: '#f3e8ff', color: '#7c3aed' };
    case 'approved':
      return { bg: '#dcfce7', color: '#166534' };
    case 'revision':
      return { bg: '#ffedd5', color: '#9a3412' };
    default:
      return { bg: 'var(--bg-surface)', color: 'var(--text-secondary)' };
  }
}

function getWriterInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ArticleCard({ article, onClick, onDelete }: ArticleCardProps) {
  const nextAction = getNextAction(article);
  const progress = getAIProgressLine(article);
  const statusStyle = getStatusColor(article.status);

  return (
    <div
      className={`article-card${article.isUpdate ? ' is-update' : ''}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          className="ac-delete"
          title="Delete article"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this article? This cannot be undone.')) {
              onDelete();
            }
          }}
          aria-label="Delete article"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6.5 7v4.5M9.5 7v4.5M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Row 1: Origin + Title + Next action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 28 }}>
        <span
          className="ac-origin"
          style={
            article.isUpdate
              ? { background: 'var(--teal-light)', color: 'var(--teal-dark)' }
              : { background: 'var(--blue-light)', color: 'var(--blue-dark)' }
          }
        >
          {article.isUpdate ? 'UPDATING' : 'NEW'}
        </span>
        <span className="ac-title" style={{ flex: 1 }}>
          {article.title}
        </span>
        <span className="ac-next">
          {nextAction}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ marginLeft: 4, verticalAlign: 'middle' }}
          >
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* Row 2: Type badges + module + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {article.types.map((t) => (
          <span
            key={t}
            className="badge"
            style={
              t === 'howto'
                ? { background: 'var(--purple-bg)', color: 'var(--purple-dark)' }
                : { background: 'var(--green-light)', color: 'var(--green-dark)' }
            }
          >
            {getTypeLabel(t)}
          </span>
        ))}
        <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          {article.module}
        </span>
        <span
          className="badge"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {getStatusLabel(article.status)}
        </span>
        {article.isUpdate && (
          <span
            className="badge"
            data-testid="updated-badge"
            style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}
          >
            Updated
          </span>
        )}
      </div>

      {/* AI progress line */}
      <div className="ac-ai-line">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: progress.color,
            flexShrink: 0,
          }}
        />
        <span>{progress.text}</span>
      </div>

      {/* Bottom row: writer */}
      <div className="ac-bottom">
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--purple-light)',
            color: 'var(--purple-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getWriterInitials(article.writer)}
        </div>
        <span>{article.writer ?? 'Unassigned'}</span>
      </div>

      <style jsx>{`
        .article-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 18px;
          cursor: pointer;
          transition: box-shadow 0.15s ease;
        }
        .article-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .ac-delete {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          border-radius: 8px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
          z-index: 1;
        }
        .article-card:hover .ac-delete {
          opacity: 1;
        }
        .ac-delete:hover {
          background: #fef2f2;
          color: #dc2626;
        }
        .article-card.is-update {
          border-left: 3px solid var(--teal);
        }
        .ac-title {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
        }
        .ac-origin {
          font-size: 11px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .ac-next {
          font-size: 11px;
          color: var(--accent);
          font-weight: 600;
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        .badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ac-ai-line {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .ac-bottom {
          display: flex;
          align-items: center;
          gap: 6px;
          border-top: 1px solid var(--border);
          padding-top: 6px;
          margin-top: 2px;
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
