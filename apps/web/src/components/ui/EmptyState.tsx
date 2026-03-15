'use client';

import Button from './Button';

interface EmptyStateProps {
  emoji: string;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  emoji,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="text-4xl mb-3">{emoji}</div>
      {title && (
        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
