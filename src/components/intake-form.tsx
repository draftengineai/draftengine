'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FeatureIntake, ChangeType } from '@/lib/types/article';
import modulesData from '@/lib/config/modules.json';

interface IntakeFormProps {
  isOpen: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onGenerate: (intake: FeatureIntake) => void;
}

type Mode = 'new' | 'update';

const CHANGE_TYPES: { value: ChangeType; label: string }[] = [
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'feature', label: 'New feature' },
  { value: 'bugfix', label: 'Bug fix' },
  { value: 'other', label: 'Other' },
];

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  new: 'Describe a new feature or change and GateDoc will generate fresh How To and What\u2019s New articles.',
  update:
    'Coming soon in Phase 2 \u2014 select existing articles and describe what changed. GateDoc will revise only the affected steps.',
};

export default function IntakeForm({ isOpen, initialMode, onClose, onGenerate }: IntakeFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'new');
  const [title, setTitle] = useState('');
  const [module, setModule] = useState('');
  const [customModule, setCustomModule] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>('enhancement');
  const [description, setDescription] = useState('');
  const [featureUrl, setFeatureUrl] = useState('');
  const [behaviorLinks, setBehaviorLinks] = useState<string[]>(['']);
  const [userStories, setUserStories] = useState<{ title: string; description: string }[]>([]);
  const [generateHowTo, setGenerateHowTo] = useState(true);
  const [generateWhatsNew, setGenerateWhatsNew] = useState(true);

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync mode when initialMode prop changes (e.g., reopened with different mode)
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Auto-uncheck What's New for bug fixes
  useEffect(() => {
    if (changeType === 'bugfix') {
      setGenerateWhatsNew(false);
    } else {
      setGenerateWhatsNew(true);
    }
  }, [changeType]);

  const resetForm = useCallback(() => {
    setMode('new');
    setTitle('');
    setModule('');
    setCustomModule('');
    setChangeType('enhancement');
    setDescription('');
    setFeatureUrl('');
    setBehaviorLinks(['']);
    setUserStories([]);
    setGenerateHowTo(true);
    setGenerateWhatsNew(true);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === 'update') return;

      const resolvedModule = module === '__other__' ? customModule : module;
      if (!title.trim() || !resolvedModule.trim() || !description.trim()) return;

      const filteredLinks = behaviorLinks.filter((l) => l.trim() !== '');

      const intake: FeatureIntake = {
        title: title.trim(),
        module: resolvedModule.trim(),
        changeType,
        description: description.trim(),
        featureUrl: featureUrl.trim() || undefined,
        behaviorRulesLinks: filteredLinks,
        userStories,
        generateHowTo,
        generateWhatsNew,
        isUpdate: false,
        targetArticleIds: [],
      };

      onGenerate(intake);
      resetForm();
    },
    [
      mode, title, module, customModule, changeType, description,
      featureUrl, behaviorLinks, userStories, generateHowTo,
      generateWhatsNew, onGenerate, resetForm,
    ],
  );

  // -- Behavior links helpers --
  const addBehaviorLink = () => setBehaviorLinks((prev) => [...prev, '']);
  const updateBehaviorLink = (idx: number, val: string) =>
    setBehaviorLinks((prev) => prev.map((l, i) => (i === idx ? val : l)));
  const removeBehaviorLink = (idx: number) =>
    setBehaviorLinks((prev) => prev.filter((_, i) => i !== idx));

  // -- User stories helpers --
  const addUserStory = () =>
    setUserStories((prev) => [...prev, { title: '', description: '' }]);
  const updateUserStory = (idx: number, field: 'title' | 'description', val: string) =>
    setUserStories((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  const removeUserStory = (idx: number) =>
    setUserStories((prev) => prev.filter((_, i) => i !== idx));

  if (!isOpen) return null;

  const isFormValid =
    mode === 'new' &&
    title.trim() !== '' &&
    (module !== '__other__' ? module.trim() !== '' : customModule.trim() !== '') &&
    description.trim() !== '';

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div ref={modalRef} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>New article</h2>
            <p style={styles.headerSubtitle}>
              Describe the feature and GateDoc will draft the articles.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
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

        {/* Mode toggle */}
        <div style={styles.body}>
          <div style={styles.modeToggle}>
            <button
              type="button"
              style={{
                ...styles.modeBtn,
                ...(mode === 'new' ? styles.modeBtnActive : {}),
              }}
              onClick={() => setMode('new')}
            >
              New article
            </button>
            <button
              type="button"
              style={{
                ...styles.modeBtn,
                ...(mode === 'update' ? styles.modeBtnActive : {}),
              }}
              onClick={() => setMode('update')}
            >
              Update existing
            </button>
          </div>

          <div style={styles.modeDesc}>{MODE_DESCRIPTIONS[mode]}</div>

          {mode === 'update' ? (
            <div style={styles.comingSoon}>
              <div style={styles.comingSoonIcon}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="16" cy="16" r="12" />
                  <polyline points="16,10 16,16 20,18" />
                </svg>
              </div>
              <p style={styles.comingSoonTitle}>Coming soon in Phase 2</p>
              <p style={styles.comingSoonText}>
                Article update mode is coming soon. For now, use <strong>New article</strong> to
                generate fresh content, or use <strong>Regenerate</strong> in the editor to revise
                existing articles with updated details.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="intake-form">
              {/* Feature title */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Feature title <span style={styles.req}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bulk volunteer import"
                  style={styles.formInput}
                  required
                />
              </div>

              {/* Module + Type of change row */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Module <span style={styles.req}>*</span>
                  </label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    style={styles.formSelect}
                    required
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
                      style={{ ...styles.formInput, marginTop: 8 }}
                      required
                    />
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Type of change <span style={styles.req}>*</span>
                  </label>
                  <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value as ChangeType)}
                    style={styles.formSelect}
                    required
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
                <label style={styles.formLabel}>
                  Description <span style={styles.req}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the feature does, who it's for, and how it works..."
                  rows={4}
                  style={styles.formTextarea}
                  required
                />
                <p style={styles.helperText}>
                  Include enough detail for GateDoc to write accurate steps. Mention UI labels,
                  button names, and navigation paths.
                </p>
                {description.trim().length > 0 && description.trim().length < 50 && (
                  <p
                    data-testid="thin-description-warning"
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
                    details about UI elements, button names, and navigation paths. You can still
                    generate, but the results may need significant editing.
                  </p>
                )}
              </div>

              {/* Feature/ticket link */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Feature or ticket link <span style={styles.opt}>(optional)</span>
                </label>
                <input
                  type="url"
                  value={featureUrl}
                  onChange={(e) => setFeatureUrl(e.target.value)}
                  placeholder="https://..."
                  style={styles.formInput}
                />
              </div>

              {/* UX behavior rules */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  UX behavior rules <span style={styles.opt}>(optional)</span>
                </label>
                {behaviorLinks.map((link, idx) => (
                  <div key={idx} style={styles.linkRow}>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateBehaviorLink(idx, e.target.value)}
                      placeholder="https://..."
                      style={{ ...styles.formInput, marginBottom: 0, flex: 1 }}
                    />
                    {behaviorLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBehaviorLink(idx)}
                        style={styles.removeBtn}
                        aria-label="Remove link"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="4" y1="4" x2="12" y2="12" />
                          <line x1="12" y1="4" x2="4" y2="12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addBehaviorLink} style={styles.addBtn}>
                  + Another link
                </button>
              </div>

              {/* User stories */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  User stories <span style={styles.opt}>(optional)</span>
                </label>
                {userStories.map((story, idx) => (
                  <div key={idx} style={styles.storyCard}>
                    <div style={styles.storyHeader}>
                      <span style={styles.storyLabel}>Story {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeUserStory(idx)}
                        style={styles.removeBtn}
                        aria-label="Remove story"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="4" y1="4" x2="12" y2="12" />
                          <line x1="12" y1="4" x2="4" y2="12" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => updateUserStory(idx, 'title', e.target.value)}
                      placeholder="Story title"
                      style={{ ...styles.formInput, marginBottom: 8 }}
                    />
                    <textarea
                      value={story.description}
                      onChange={(e) => updateUserStory(idx, 'description', e.target.value)}
                      placeholder="As a [role], I want to [action] so that [benefit]..."
                      rows={2}
                      style={{ ...styles.formTextarea, marginBottom: 0 }}
                    />
                  </div>
                ))}
                <button type="button" onClick={addUserStory} style={styles.addBtn}>
                  + Add user story
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.checkboxGroup}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={generateHowTo}
                onChange={(e) => setGenerateHowTo(e.target.checked)}
                style={styles.checkbox}
              />
              How to
            </label>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={generateWhatsNew}
                onChange={(e) => setGenerateWhatsNew(e.target.checked)}
                style={styles.checkbox}
              />
              What&apos;s new
            </label>
          </div>
          <button
            type="submit"
            form="intake-form"
            disabled={!isFormValid}
            style={{
              ...styles.generateBtn,
              ...(!isFormValid ? styles.generateBtnDisabled : {}),
            }}
          >
            Generate articles
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles matching v8 mockup                                   */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 620,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
  },

  /* Header */
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
  },

  /* Body */
  body: {
    padding: '16px 24px',
    flex: 1,
    overflowY: 'auto',
  },

  /* Mode toggle */
  modeToggle: {
    display: 'flex',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    transition: 'background 0.15s, color 0.15s',
    border: 'none',
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: 'var(--accent)',
    color: '#FFFFFF',
  },

  /* Mode description */
  modeDesc: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    padding: '8px 12px',
    background: 'var(--bg-surface)',
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 1.5,
  },

  /* Coming soon */
  comingSoon: {
    textAlign: 'center' as const,
    padding: '48px 24px',
  },
  comingSoonIcon: {
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 6,
  },
  comingSoonText: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    maxWidth: 360,
    margin: '0 auto',
    lineHeight: 1.5,
  },

  /* Form */
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

  /* Link rows */
  linkRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },

  /* Story cards */
  storyCard: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    background: 'var(--bg-surface)',
  },
  storyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },

  /* Buttons */
  addBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
  },
  removeBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
  },

  /* Footer */
  footer: {
    padding: '14px 24px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
  },
  checkboxGroup: {
    display: 'flex',
    gap: 16,
  },
  checkLabel: {
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  generateBtn: {
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
  generateBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
