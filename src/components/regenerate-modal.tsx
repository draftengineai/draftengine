'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChangeType } from '@/lib/types/article';
import modulesData from '@/lib/config/modules.json';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (data: {
    title: string;
    module: string;
    changeType: ChangeType;
    description: string;
    additionalGuidance: string;
  }) => void;
  initialTitle: string;
  initialModule: string;
  initialChangeType: ChangeType;
  initialDescription?: string;
  regenerating?: boolean;
}

const CHANGE_TYPES: { value: ChangeType; label: string }[] = [
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'feature', label: 'New feature' },
  { value: 'bugfix', label: 'Bug fix' },
  { value: 'other', label: 'Other' },
];

export default function RegenerateModal({
  isOpen,
  onClose,
  onRegenerate,
  initialTitle,
  initialModule,
  initialChangeType,
  initialDescription,
  regenerating,
}: RegenerateModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [module, setModule] = useState('');
  const [customModule, setCustomModule] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>(initialChangeType);
  const [description, setDescription] = useState('');
  const [guidance, setGuidance] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen || regenerating) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, regenerating]);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setChangeType(initialChangeType);
      const knownModules: string[] = modulesData.modules;
      if (knownModules.includes(initialModule)) {
        setModule(initialModule);
        setCustomModule('');
      } else {
        setModule('__other__');
        setCustomModule(initialModule);
      }
      setDescription(initialDescription || '');
      setGuidance('');
    }
  }, [isOpen, initialTitle, initialModule, initialChangeType, initialDescription]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (!regenerating) onClose();
      }
    },
    [onClose, regenerating],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const resolvedModule = module === '__other__' ? customModule : module;
      if (!title.trim() || !resolvedModule.trim() || !description.trim()) return;
      onRegenerate({
        title: title.trim(),
        module: resolvedModule.trim(),
        changeType,
        description: description.trim(),
        additionalGuidance: guidance.trim(),
      });
    },
    [title, module, customModule, changeType, description, guidance, onRegenerate],
  );

  if (!isOpen) return null;

  const resolvedModule = module === '__other__' ? customModule : module;
  const isValid = title.trim() !== '' && resolvedModule.trim() !== '' && description.trim() !== '';

  return (
    <div style={styles.overlay} onClick={handleOverlayClick} role="presentation">
      <div ref={modalRef} style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="regenerate-modal-title" tabIndex={-1}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 id="regenerate-modal-title" style={styles.headerTitle}>Regenerate article</h2>
            <p style={styles.headerSubtitle}>
              Update the details below and the AI will generate fresh content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={regenerating}
            style={styles.closeBtn}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <form onSubmit={handleSubmit} id="regenerate-form">
            {/* Guidance */}
            <div style={styles.formGroup}>
              <label htmlFor="regen-guidance" style={styles.formLabel}>
                What should the AI do differently this time?{' '}
                <span style={styles.opt}>(optional)</span>
              </label>
              <textarea
                id="regen-guidance"
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder='e.g. "Add more detail about the search filters" or "Focus on the mobile experience"'
                rows={2}
                style={styles.formTextarea}
                disabled={regenerating}
              />
            </div>

            {/* Title */}
            <div style={styles.formGroup}>
              <label htmlFor="regen-title" style={styles.formLabel}>
                Feature title <span style={styles.req}>*</span>
              </label>
              <input
                id="regen-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.formInput}
                required
                disabled={regenerating}
              />
            </div>

            {/* Module + Type row */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label htmlFor="regen-module" style={styles.formLabel}>
                  Module <span style={styles.req}>*</span>
                </label>
                <select
                  id="regen-module"
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  style={styles.formSelect}
                  required
                  disabled={regenerating}
                >
                  <option value="" disabled>
                    Select module
                  </option>
                  {modulesData.modules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="__other__">Other</option>
                </select>
                {module === '__other__' && (
                  <input
                    type="text"
                    value={customModule}
                    onChange={(e) => setCustomModule(e.target.value)}
                    placeholder="Enter module name"
                    aria-label="Custom module name"
                    style={{ ...styles.formInput, marginTop: 8 }}
                    required
                    disabled={regenerating}
                  />
                )}
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="regen-change-type" style={styles.formLabel}>
                  Type of change <span style={styles.req}>*</span>
                </label>
                <select
                  id="regen-change-type"
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value as ChangeType)}
                  style={styles.formSelect}
                  required
                  disabled={regenerating}
                >
                  {CHANGE_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label htmlFor="regen-description" style={styles.formLabel}>
                Description <span style={styles.req}>*</span>
              </label>
              <textarea
                id="regen-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature with enough detail for accurate steps. Mention UI labels, button names, and navigation paths..."
                rows={4}
                style={styles.formTextarea}
                required
                disabled={regenerating}
              />
              <p style={styles.helperText}>
                This is the most important field. Include specific UI labels, button names, and
                navigation paths for the best results.
              </p>
              {description.trim().length > 0 && description.trim().length < 50 && (
                <p
                  data-testid="regen-thin-description-warning"
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--amber-dark)',
                    backgroundColor: 'var(--amber-light)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  Your description is very brief. The AI generates better articles with specific
                  details about UI elements, button names, and navigation paths.
                </p>
              )}
            </div>

            {/* Warning */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                backgroundColor: 'var(--amber-light)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--amber-dark)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>&#9888;</span>
              <span>
                This will replace the current article content. Any manual edits will be lost.
              </span>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={regenerating}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="regenerate-form"
            disabled={!isValid || regenerating}
            style={{
              ...styles.regenBtn,
              ...(!isValid || regenerating ? styles.regenBtnDisabled : {}),
            }}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 580,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 24px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    margin: '2px 0 0',
  },
  closeBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    flexShrink: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  body: {
    padding: '16px 24px',
    flex: 1,
    overflowY: 'auto',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  req: {
    color: 'var(--red)',
  },
  opt: {
    fontWeight: 400,
    textTransform: 'none' as const,
    color: 'var(--text-tertiary)',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    background: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    background: '#FFFFFF',
    outline: 'none',
    appearance: 'auto' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    background: '#FFFFFF',
    outline: 'none',
    resize: 'vertical' as const,
    lineHeight: 1.5,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  helperText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  footer: {
    padding: '14px 24px 18px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderTop: '1px solid var(--border)',
  },
  cancelBtn: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 8,
    border: '1px solid var(--border)',
    cursor: 'pointer',
  },
  regenBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: 'var(--accent)',
    color: '#FFFFFF',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  regenBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
