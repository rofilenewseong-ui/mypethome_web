'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-sm rounded-[var(--radius-lg)] p-6 animate-slide-up"
        style={{
          background: 'var(--bg-warm)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-elevated)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3
            className="text-base font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
