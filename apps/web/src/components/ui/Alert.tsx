'use client';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  info: { bg: 'rgba(100, 200, 255, 0.06)', border: 'rgba(100, 200, 255, 0.15)', color: 'var(--accent-blue)' },
  success: { bg: 'rgba(107, 142, 94, 0.08)', border: 'rgba(107, 142, 94, 0.15)', color: 'var(--accent-green)' },
  warning: { bg: 'rgba(196, 137, 77, 0.08)', border: 'rgba(196, 137, 77, 0.15)', color: 'var(--accent-orange)' },
  error: { bg: 'rgba(196, 92, 74, 0.06)', border: 'rgba(196, 92, 74, 0.15)', color: 'var(--accent-red)' },
};

export default function Alert({
  variant = 'info',
  icon,
  children,
  className = '',
}: AlertProps) {
  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-[var(--radius-sm)] px-4 py-3 ${className}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-start gap-2">
        {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
        <div className="text-[11px]" style={{ color: style.color }}>
          {children}
        </div>
      </div>
    </div>
  );
}
