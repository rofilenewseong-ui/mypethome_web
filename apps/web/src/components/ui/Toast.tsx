'use client';

import { useEffect, useRef } from 'react';
import { useToastStore, type ToastType } from '@/stores/useToastStore';

const icons: Record<ToastType, string> = {
  success: '\u2714',
  error: '\u2716',
  info: '\u2139',
  warning: '\u26A0',
};

const styles: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: {
    bg: 'rgba(107, 142, 94, 0.95)',
    border: 'rgba(107, 142, 94, 0.4)',
    color: '#fff',
  },
  error: {
    bg: 'rgba(185, 94, 77, 0.95)',
    border: 'rgba(185, 94, 77, 0.4)',
    color: '#fff',
  },
  info: {
    bg: 'rgba(95, 154, 198, 0.95)',
    border: 'rgba(95, 154, 198, 0.4)',
    color: '#fff',
  },
  warning: {
    bg: 'rgba(184, 119, 66, 0.95)',
    border: 'rgba(184, 119, 66, 0.4)',
    color: '#fff',
  },
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.classList.add('toast-exit');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const s = styles[type];

  return (
    <div
      ref={ref}
      className="toast-enter"
      onClick={() => removeToast(id)}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: 12,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(8px)',
        maxWidth: 340,
        width: '100%',
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        width: '100%',
        maxWidth: 380,
        padding: '0 20px',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <ToastItem id={t.id} message={t.message} type={t.type} />
        </div>
      ))}
    </div>
  );
}
