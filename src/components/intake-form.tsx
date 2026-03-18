'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FeatureIntake, ChangeType, ScanResult } from '@/lib/types/article';
import modulesData from '@/lib/config/modules.json';

interface IntakeFormProps {
  isOpen: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onGenerate: (intake: FeatureIntake) => void;
  onUpdate?: (firstArticleId: string) => void;
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
    'Describe what changed about an existing feature. GateDoc will find affected articles and revise only the steps that need updating.',
};

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: '#FEE2E2', text: '#DC2626' },
  medium: { bg: '#FEF3C7', text: '#D97706' },
  low: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function IntakeForm({ isOpen, initialMode, onClose, onGenerate, onUpdate }: IntakeFormProps) {
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

  // Update mode state
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [updateResults, setUpdateResults] = useState<{ succeeded: string[]; failed: string[] } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync mode when initialMode prop changes (e.g., reopened with different mode)
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Focus management: capture previous focus and focus modal on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the modal container after render
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

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
    setScanning(false);
    setScanResults(null);
    setSelectedArticles(new Set());
    setUpdating(false);
    setUpdateProgress(null);
    setUpdateResults(null);
    setScanError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

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

  // -- Scan + Update handlers (update mode) --
  const handleScan = useCallback(async () => {
    const resolvedModule = module === '__other__' ? customModule : module;
    if (!resolvedModule.trim() || !description.trim()) return;

    setScanning(true);
    setScanResults(null);
    setScanError(null);
    setSelectedArticles(new Set());

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeDescription: description.trim(),
          module: resolvedModule.trim(),
          changeType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Scan failed');
      }
      const data = await res.json();
      const matches: ScanResult[] = data.matches || [];
      setScanResults(matches);

      // Pre-check HIGH and MEDIUM confidence matches
      const preChecked = new Set<string>();
      for (const m of matches) {
        if (m.confidence === 'high' || m.confidence === 'medium') {
          preChecked.add(m.articleId);
        }
      }
      setSelectedArticles(preChecked);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, [module, customModule, description, changeType]);

  const handleUpdateSelected = useCallback(async () => {
    if (selectedArticles.size === 0 || !scanResults) return;
    setUpdating(true);
    setUpdateResults(null);
    setScanError(null);

    const articleIds = [...selectedArticles];
    const succeeded: string[] = [];
    const failed: string[] = [];
    let firstSuccessId: string | null = null;

    for (let i = 0; i < articleIds.length; i++) {
      const articleId = articleIds[i];
      const match = scanResults.find((m) => m.articleId === articleId);
      const title = match?.title ?? articleId;

      setUpdateProgress({ current: i + 1, total: articleIds.length, title });

      try {
        const res = await fetch('/api/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId,
            changeDescription: description.trim(),
            changeType,
            affectedSteps: [],
          }),
        });
        if (!res.ok) throw new Error(`Update failed for ${title}`);
        const data = await res.json();
        succeeded.push(title);
        if (!firstSuccessId) firstSuccessId = data.id;
      } catch {
        failed.push(title);
      }
    }

    setUpdateProgress(null);

    if (failed.length > 0) {
      setUpdateResults({ succeeded, failed });
      setUpdating(false);
    } else if (firstSuccessId && onUpdate) {
      onUpdate(firstSuccessId);
      resetForm();
      onClose();
    } else {
      setUpdating(false);
    }
  }, [selectedArticles, scanResults, description, changeType, onUpdate, resetForm, onClose]);

  const toggleArticleSelection = useCallback((articleId: string) => {
    setSelectedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

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

  const isUpdateScanValid =
    (module !== '__other__' ? module.trim() !== '' : customModule.trim() !== '') &&
    description.trim() !== '';

  return (
    <div style={styles.overlay} onClick={handleOverlayClick} role="presentation">
      <div ref={modalRef} style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="intake-modal-title" tabIndex={-1}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 id="intake-modal-title" style={styles.headerTitle}>New article</h2>
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
          <div style={styles.modeToggle} data-testid="mode-toggle" role="tablist" aria-label="Article mode">
            <button
              type="button"
              data-testid="mode-new"
              role="tab"
              aria-selected={mode === 'new'}
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
              data-testid="mode-update"
              role="tab"
              aria-selected={mode === 'update'}
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
            <div>
              <form
                id="update-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScan();
                }}
              >
                {/* Module + Type of change row */}
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label htmlFor="update-module" style={styles.formLabel}>
                      Module <span style={styles.req}>*</span>
                    </label>
                    <select
                      id="update-module"
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
                        aria-label="Custom module name"
                        style={{ ...styles.formInput, marginTop: 8 }}
                        required
                      />
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label htmlFor="update-change-type" style={styles.formLabel}>
                      Type of change <span style={styles.req}>*</span>
                    </label>
                    <select
                      id="update-change-type"
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

                {/* What changed */}
                <div style={styles.formGroup}>
                  <label htmlFor="update-description" style={styles.formLabel}>
                    What changed <span style={styles.req}>*</span>
                  </label>
                  <textarea
                    id="update-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what changed about this feature. Be specific about which UI elements, buttons, or steps were affected..."
                    rows={4}
                    style={styles.formTextarea}
                    required
                  />
                </div>
              </form>

              {/* Scan results */}
              {scanning && (
                <div style={styles.scanLoading} data-testid="scan-loading">
                  <div style={styles.spinner} />
                  <span>Scanning articles...</span>
                </div>
              )}

              {scanError && (
                <div style={styles.scanError}>
                  {scanError}
                </div>
              )}

              {scanResults !== null && !scanning && (
                <div data-testid="scan-results">
                  {scanResults.length === 0 ? (
                    <div style={styles.noMatches} data-testid="no-matches">
                      No affected articles found. Try broadening your description or check the module.
                    </div>
                  ) : (
                    <div style={styles.matchList}>
                      <div style={styles.matchListHeader}>
                        Affected articles ({scanResults.length})
                      </div>
                      {scanResults.map((match) => {
                        const colors = CONFIDENCE_COLORS[match.confidence] || CONFIDENCE_COLORS.low;
                        return (
                          <label
                            key={match.articleId}
                            style={styles.matchItem}
                            data-testid="scan-match"
                          >
                            <input
                              type="checkbox"
                              checked={selectedArticles.has(match.articleId)}
                              onChange={() => toggleArticleSelection(match.articleId)}
                              style={styles.checkbox}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={styles.matchTitleRow}>
                                <span style={styles.matchTitle}>{match.title}</span>
                                <span
                                  style={{
                                    ...styles.confidenceBadge,
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                  }}
                                  data-testid={`confidence-${match.confidence}`}
                                >
                                  {match.confidence.toUpperCase()}
                                </span>
                              </div>
                              <p style={styles.matchReason}>{match.reason}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Updating loading */}
              {updating && updateProgress && (
                <div style={styles.scanLoading} data-testid="update-loading">
                  <div style={styles.spinner} />
                  <span>Updating article {updateProgress.current} of {updateProgress.total}... {updateProgress.title}</span>
                </div>
              )}

              {/* Update results with failures */}
              {updateResults && updateResults.failed.length > 0 && (
                <div data-testid="update-results" style={{ marginTop: 12 }}>
                  {updateResults.succeeded.length > 0 && (
                    <div style={styles.updateSuccess}>
                      Succeeded: {updateResults.succeeded.join(', ')}
                    </div>
                  )}
                  <div style={styles.scanError}>
                    Failed: {updateResults.failed.join(', ')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="intake-form">
              {/* Feature title */}
              <div style={styles.formGroup}>
                <label htmlFor="intake-title" style={styles.formLabel}>
                  Feature title <span style={styles.req}>*</span>
                </label>
                <input
                  id="intake-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bulk user import"
                  style={styles.formInput}
                  required
                />
              </div>

              {/* Module + Type of change row */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label htmlFor="intake-module" style={styles.formLabel}>
                    Module <span style={styles.req}>*</span>
                  </label>
                  <select
                    id="intake-module"
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
                      aria-label="Custom module name"
                      style={{ ...styles.formInput, marginTop: 8 }}
                      required
                    />
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label htmlFor="intake-change-type" style={styles.formLabel}>
                    Type of change <span style={styles.req}>*</span>
                  </label>
                  <select
                    id="intake-change-type"
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
                <label htmlFor="intake-description" style={styles.formLabel}>
                  Description <span style={styles.req}>*</span>
                </label>
                <textarea
                  id="intake-description"
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
                <label htmlFor="intake-feature-url" style={styles.formLabel}>
                  Feature or ticket link <span style={styles.opt}>(optional)</span>
                </label>
                <input
                  id="intake-feature-url"
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
          {mode === 'new' ? (
            <>
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
            </>
          ) : (
            <>
              <div />
              {scanResults && scanResults.length > 0 && !updating ? (
                <button
                  type="button"
                  onClick={handleUpdateSelected}
                  disabled={selectedArticles.size === 0}
                  style={{
                    ...styles.generateBtn,
                    ...(selectedArticles.size === 0 ? styles.generateBtnDisabled : {}),
                  }}
                >
                  Update selected articles
                </button>
              ) : (
                <button
                  type="submit"
                  form="update-form"
                  disabled={!isUpdateScanValid || scanning}
                  style={{
                    ...styles.generateBtn,
                    ...(!isUpdateScanValid || scanning ? styles.generateBtnDisabled : {}),
                  }}
                >
                  Find affected articles
                </button>
              )}
            </>
          )}
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

  /* Scan results */
  scanLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 0',
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  scanError: {
    fontSize: 13,
    color: 'var(--red)',
    padding: '8px 12px',
    background: '#FEE2E2',
    borderRadius: 8,
    marginTop: 8,
  },
  updateSuccess: {
    fontSize: 13,
    color: '#047857',
    padding: '8px 12px',
    background: '#D1FAE5',
    borderRadius: 8,
    marginBottom: 8,
  },
  noMatches: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    padding: '24px 12px',
    textAlign: 'center' as const,
    background: 'var(--bg-surface)',
    borderRadius: 8,
    marginTop: 8,
  },
  matchList: {
    marginTop: 12,
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchListHeader: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
  },
  matchItem: {
    display: 'flex',
    gap: 10,
    padding: '12px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    alignItems: 'flex-start',
  },
  matchTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
  },
  confidenceBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  matchReason: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    lineHeight: 1.4,
    margin: 0,
  },
};
