'use client';

import { useState, useEffect, useRef } from 'react';

type StepStatus = 'pending' | 'active' | 'done';

interface Step {
  label: string;
  status: StepStatus;
}

interface GenerationLoadingProps {
  title: string;
  module: string;
}

const STEP_LABELS = [
  'Reading feature details',
  'Loading writing standards',
  'Generating How to article',
  'Generating What\u2019s new article',
  'Quality checks',
];

// Delays (ms) before each step transitions to "done" and the next becomes "active".
// Step 0 starts as done immediately, step 1 completes after 2s, then the rest
// are driven by the real API call completing.
const TIMED_DELAYS = [0, 2000];

export default function GenerationLoading({
  title,
  module,
}: GenerationLoadingProps) {
  const [steps, setSteps] = useState<Step[]>(() =>
    STEP_LABELS.map((label, i) => ({
      label,
      status: i === 0 ? 'done' : i === 1 ? 'active' : 'pending',
    }))
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Step 1 ("Loading writing standards") becomes done after 2s, step 2 becomes active
    const t = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i === 1) return { ...s, status: 'done' };
          if (i === 2) return { ...s, status: 'active' };
          return s;
        })
      );

      // After another 8s, advance step 2→done, step 3→active (simulated progress
      // in case the API is still running — this is cosmetic only)
      const t2 = setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) => {
            if (i === 2) return { ...s, status: 'done' };
            if (i === 3) return { ...s, status: 'active' };
            return s;
          })
        );
      }, 8000);
      timersRef.current.push(t2);
    }, TIMED_DELAYS[1]);

    timersRef.current.push(t);
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fade-in 300ms ease',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'gen-spin 0.8s linear infinite',
          marginBottom: 20,
        }}
      />

      {/* Title */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
        Generating
      </h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          marginTop: 2,
        }}
      >
        {module}
      </p>

      {/* Step list */}
      <div style={{ maxWidth: 320, width: '100%', marginTop: 24 }}>
        {steps.map((step) => (
          <div
            key={step.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              fontSize: 13,
              color:
                step.status === 'done'
                  ? 'var(--green-dark)'
                  : step.status === 'active'
                    ? 'var(--text)'
                    : 'var(--text-tertiary)',
              fontWeight: step.status === 'active' ? 500 : 400,
              transition: 'color 300ms ease',
            }}
          >
            <StepDot status={step.status} />
            {step.label}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes gen-spin { to { transform: rotate(360deg) } }
        @keyframes gen-dot-spin { to { transform: rotate(360deg) } }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}

function StepDot({ status }: { status: StepStatus }) {
  const base: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    flexShrink: 0,
    transition: 'all 300ms ease',
  };

  if (status === 'done') {
    return (
      <div
        style={{
          ...base,
          background: 'var(--green)',
          borderColor: 'var(--green)',
          border: '1.5px solid var(--green)',
          color: 'white',
        }}
      >
        &#x2713;
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div
        style={{
          ...base,
          background: 'var(--accent)',
          border: '1.5px solid var(--accent)',
          color: 'white',
          animation: 'gen-dot-spin 1.2s linear infinite',
        }}
      >
        &#x2022;
      </div>
    );
  }

  // pending
  return (
    <div
      style={{
        ...base,
        background: 'transparent',
        border: '1.5px solid currentColor',
      }}
    />
  );
}
