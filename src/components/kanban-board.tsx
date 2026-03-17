'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Article, ArticleStatus } from '@/lib/types/article';

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColumnId = 'todo' | 'inprogress' | 'complete';

interface ColumnDef {
  id: ColumnId;
  label: string;
  statuses: ArticleStatus[];
  headerColor: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'todo', label: 'To Do', statuses: ['generated'], headerColor: 'var(--blue)' },
  { id: 'inprogress', label: 'In Progress', statuses: ['editing', 'shared', 'revision'], headerColor: 'var(--amber)' },
  { id: 'complete', label: 'Complete', statuses: ['approved'], headerColor: '#16a34a' },
];

function getColumnForStatus(status: ArticleStatus): ColumnId {
  for (const col of COLUMNS) {
    if (col.statuses.includes(status)) return col.id;
  }
  return 'todo';
}

// ---------------------------------------------------------------------------
// Status badge helpers (duplicated from article-card to keep compact)
// ---------------------------------------------------------------------------

function getStatusLabel(status: string): string {
  switch (status) {
    case 'editing': return 'Editing';
    case 'generated': return 'Generated';
    case 'shared': return 'Shared';
    case 'approved': return 'Approved';
    case 'revision': return 'Revision';
    default: return status;
  }
}

function getStatusColor(status: string): { bg: string; color: string } {
  switch (status) {
    case 'editing': return { bg: 'var(--amber-light)', color: 'var(--amber-dark)' };
    case 'generated': return { bg: 'var(--blue-light)', color: 'var(--blue-dark)' };
    case 'shared': return { bg: '#f3e8ff', color: '#7c3aed' };
    case 'approved': return { bg: '#dcfce7', color: '#166534' };
    case 'revision': return { bg: '#ffedd5', color: '#9a3412' };
    default: return { bg: 'var(--bg-surface)', color: 'var(--text-secondary)' };
  }
}

// ---------------------------------------------------------------------------
// Compact kanban card
// ---------------------------------------------------------------------------

interface KanbanCardProps {
  article: Article;
  onClick: () => void;
  isDragging?: boolean;
}

function KanbanCardInner({ article, onClick, isDragging }: KanbanCardProps) {
  const statusStyle = getStatusColor(article.status);
  const isRevision = article.status === 'revision';

  return (
    <div
      className="kanban-card"
      onClick={onClick}
      data-testid="kanban-card"
      data-article-id={article.id}
      data-revision={isRevision ? 'true' : undefined}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: isRevision ? '3px solid #d97706' : '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
        {article.title}
      </div>
      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 20,
            fontWeight: 600,
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
          }}
        >
          {article.module}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 20,
            fontWeight: 600,
            background: statusStyle.bg,
            color: statusStyle.color,
          }}
        >
          {getStatusLabel(article.status)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable wrapper
// ---------------------------------------------------------------------------

function SortableCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCardInner article={article} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column component
// ---------------------------------------------------------------------------

interface ColumnProps {
  def: ColumnDef;
  articles: Article[];
  onCardClick: (id: string) => void;
}

function Column({ def, articles, onCardClick }: ColumnProps) {
  return (
    <div
      data-testid={`kanban-column-${def.id}`}
      data-column-id={def.id}
      style={{
        flex: 1,
        minWidth: 220,
        background: 'var(--bg-surface)',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 120,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
          paddingBottom: 8,
          borderBottom: `2px solid ${def.headerColor}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          {def.label}
        </span>
        <span
          data-testid={`kanban-count-${def.id}`}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-card)',
            padding: '0px 6px',
            borderRadius: 10,
          }}
        >
          {articles.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={articles.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        {articles.map((article) => (
          <SortableCard
            key={article.id}
            article={article}
            onClick={() => onCardClick(article.id)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  articles: Article[];
  onCardClick: (id: string) => void;
  onReorder: (articleId: string, newPriority: number) => void;
  onStatusChange: (articleId: string, newStatus: ArticleStatus) => void;
}

export default function KanbanBoard({ articles, onCardClick, onReorder, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localArticles, setLocalArticles] = useState<Article[]>(articles);

  // Keep local state in sync with props
  React.useEffect(() => {
    setLocalArticles(articles);
  }, [articles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnArticles = useMemo(() => {
    const grouped: Record<ColumnId, Article[]> = { todo: [], inprogress: [], complete: [] };
    for (const article of localArticles) {
      const col = getColumnForStatus(article.status);
      grouped[col].push(article);
    }
    // Sort by priority within each column
    for (const col of Object.values(grouped)) {
      col.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }
    return grouped;
  }, [localArticles]);

  const activeArticle = activeId ? localArticles.find((a) => a.id === activeId) : null;

  function findColumn(id: string): ColumnId | null {
    for (const [colId, items] of Object.entries(columnArticles)) {
      if (items.some((a) => a.id === id)) return colId as ColumnId;
    }
    // Check if id is a column id
    if (id in columnArticles) return id as ColumnId;
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    let overCol = findColumn(over.id as string);

    // If over target is a column container
    if (!overCol && (over.id as string) in columnArticles) {
      overCol = over.id as ColumnId;
    }

    if (!activeCol || !overCol || activeCol === overCol) return;

    // Block moves to/from 'complete'
    if (overCol === 'complete' || activeCol === 'complete') return;

    // Moving between todo and inprogress
    setLocalArticles((prev) => {
      return prev.map((a) => {
        if (a.id === active.id) {
          const newStatus: ArticleStatus = overCol === 'todo' ? 'generated' : 'editing';
          return { ...a, status: newStatus };
        }
        return a;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);

    if (!activeCol || !overCol) return;

    if (activeCol === overCol) {
      // Reorder within column
      const items = columnArticles[activeCol];
      const oldIndex = items.findIndex((a) => a.id === active.id);
      const newIndex = items.findIndex((a) => a.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update priorities
        reordered.forEach((article, idx) => {
          onReorder(article.id, idx);
        });
        // Optimistically update local state
        setLocalArticles((prev) => {
          const updated = [...prev];
          reordered.forEach((article, idx) => {
            const i = updated.findIndex((a) => a.id === article.id);
            if (i !== -1) updated[i] = { ...updated[i], priority: idx };
          });
          return updated;
        });
      }
    } else {
      // Status change happened in dragOver — persist it
      const article = localArticles.find((a) => a.id === active.id);
      if (article) {
        onStatusChange(article.id, article.status);
      }
    }
  }

  return (
    <div data-testid="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              def={col}
              articles={columnArticles[col.id]}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeArticle ? (
            <KanbanCardInner article={activeArticle} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
