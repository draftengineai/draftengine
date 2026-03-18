'use client';

import React from 'react';

const SAMPLE_STEPS = [
  {
    title: 'Open the Products module',
    body: 'From the main dashboard, click <b>Products</b> in the left sidebar to open the Products module.',
    screenshot: 'Screenshot showing the Products link highlighted in the sidebar navigation',
    flag: null,
  },
  {
    title: 'Click the Search icon',
    body: 'In the top-right corner of the Products list, click the <b>Search</b> icon to open the search bar.',
    screenshot: null,
    flag: {
      what: 'The exact icon placement may differ depending on your screen resolution.',
      why: 'The feature spec mentions "top-right" but does not include a screenshot to confirm.',
      action: 'Verify the search icon location in the live product and update if needed.',
    },
  },
  {
    title: 'Enter your search query',
    body: 'Type your search term into the <b>Search products</b> field. Results filter automatically as you type.',
    screenshot: 'Screenshot showing the search bar with a sample query and filtered results',
    flag: null,
  },
  {
    title: 'Review and select a result',
    body: 'Browse the filtered results below the search bar. Click on any <b>product name</b> to open its detail page.',
    screenshot: null,
    flag: {
      what: 'The spec does not clarify whether partial matches are supported.',
      why: 'Search behavior (exact vs. partial match) was not specified in the feature requirements.',
      action: 'Test partial-match behavior and document the actual result.',
    },
  },
];

function FlagCard({ flag }: { flag: { what: string; why: string; action: string } }) {
  return (
    <div style={{
      border: '1px solid #E8C97A',
      borderRadius: 8,
      overflow: 'hidden',
      marginTop: 12,
    }}>
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#FAEEDA',
        fontSize: 12,
        fontWeight: 700,
        color: '#633806',
      }}>
        {'\u26A0'} AI flagged this step
      </div>
      <div style={{ padding: '10px 12px' }}>
        {[
          ['WHAT', flag.what],
          ['WHY', flag.why],
          ['ACTION', flag.action],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5E5D5B', minWidth: 50, flexShrink: 0 }}>
              {label}
            </span>
            <span style={{ fontSize: 12, color: '#1A1A18' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotPlaceholder({ description }: { description: string }) {
  return (
    <div style={{
      border: '2px dashed #1A5FA6',
      backgroundColor: '#E6F1FB',
      borderRadius: 8,
      minHeight: 120,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 16,
      marginTop: 12,
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: '#1A5FA6' }}>
        <rect x="3" y="7" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h5A1.5 1.5 0 0 1 18 5.5V7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="15" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span style={{ fontSize: 11, color: '#5E5D5B', textAlign: 'center', lineHeight: 1.4 }}>
        {description}
      </span>
    </div>
  );
}

export default function PublicLanding() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      fontFamily: "var(--font-dm-sans, 'DM Sans', system-ui, sans-serif)",
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid #E4E3DF',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: '#534AB7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}>
            D
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>
            DraftEngine
          </span>
        </div>
        <a
          href="https://github.com/draftengineai/draftengine"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#5E5D5B',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View on GitHub
        </a>
      </header>

      {/* Hero */}
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '48px 24px 0',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1A1A18', marginBottom: 8 }}>
          DraftEngine
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#5E5D5B', marginBottom: 40, lineHeight: 1.5 }}>
          AI-powered documentation engine — generate knowledge center articles from feature specs.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
          <a
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 20px',
              backgroundColor: '#534AB7',
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Try it yourself
          </a>
          <a
            href="https://github.com/draftengineai/draftengine"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              color: '#1A1A18',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #E4E3DF',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Sample Article */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#5E5D5B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Sample article
          </h2>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E4E3DF',
            padding: '32px',
            marginBottom: 48,
          }}>
            {/* Article header */}
            <div style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: '#E6F1FB',
              color: '#1A5FA6',
              padding: '2px 10px',
              borderRadius: 20,
              marginBottom: 16,
            }}>
              How To
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A18', marginBottom: 8 }}>
              How to Search for Products
            </h3>
            <p style={{ fontSize: 14, color: '#5E5D5B', lineHeight: 1.6, marginBottom: 24 }}>
              Use the search feature in the Products module to quickly find specific products by name, SKU, or category. This article walks you through opening the search bar, entering a query, and selecting a result.
            </p>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {SAMPLE_STEPS.map((step, i) => (
                <div key={i}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A18', marginBottom: 6 }}>
                    Step {i + 1}: {step.title}
                  </h4>
                  <p
                    style={{ fontSize: 14, color: '#1A1A18', lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: step.body }}
                  />
                  {step.screenshot && (
                    <ScreenshotPlaceholder description={step.screenshot} />
                  )}
                  {step.flag && <FlagCard flag={step.flag} />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '24px 0 48px',
          fontSize: 13,
          color: '#5E5D5B',
        }}>
          Built with Next.js and Claude.{' '}
          <a
            href="https://github.com/draftengineai/draftengine"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#534AB7', textDecoration: 'none' }}
          >
            Source on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
