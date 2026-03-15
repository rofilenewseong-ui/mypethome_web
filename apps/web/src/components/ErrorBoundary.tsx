'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: 'var(--bg-primary, #f4ede4)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 48, marginBottom: 16 }}>⚠️</span>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary, #453127)',
              marginBottom: 8,
            }}
          >
            문제가 발생했습니다
          </h2>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted, #a38472)',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            일시적인 오류입니다. 다시 시도해 주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{
              padding: '10px 28px',
              borderRadius: 12,
              background: 'var(--gradient-warm, linear-gradient(135deg, #8f664f, #b9916f))',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
