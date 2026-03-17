'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: 'writer' }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, role: 'admin' }),
      });

      if (res.ok) {
        router.push('/admin/dashboard');
        router.refresh();
      } else {
        setError('Incorrect admin password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <div style={{
        background: 'white',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '380px',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          GateDoc
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Enter the password to continue
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-password" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            required
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {error && !showAdmin && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && !showAdmin ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Admin access link */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            data-testid="admin-access-link"
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Admin access
          </button>
        </div>

        {/* Admin login form */}
        {showAdmin && (
          <form onSubmit={handleAdminSubmit} style={{ marginTop: '0.75rem' }}>
            <label htmlFor="admin-password" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
              Admin password
            </label>
            <input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              aria-label="Admin password"
              required
              data-testid="admin-password-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                marginBottom: '0.75rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {error && showAdmin && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="admin-login-btn"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && showAdmin ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
