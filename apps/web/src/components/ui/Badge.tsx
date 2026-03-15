'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'status' | 'tier' | 'count' | 'info';
  color?: string;
  size?: 'sm' | 'md';
  pill?: boolean;
  className?: string;
}

const variantStyles: Record<string, { background: string; color: string; border?: string }> = {
  default: {
    background: 'var(--accent-warm-bg)',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(178, 150, 125, 0.3)',
  },
  status: {
    background: 'rgba(107, 142, 94, 0.9)',
    color: '#fff',
  },
  tier: {
    background: 'var(--gradient-silver)',
    color: '#fff',
  },
  count: {
    background: 'var(--accent-red)',
    color: '#fff',
  },
  info: {
    background: 'rgba(107, 142, 94, 0.2)',
    color: '#6B8E5E',
  },
};

export default function Badge({
  children,
  variant = 'default',
  color,
  size = 'sm',
  pill = true,
  className = '',
}: BadgeProps) {
  const style = variantStyles[variant] || variantStyles.default;

  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]';

  return (
    <span
      className={`${sizeClass} ${pill ? 'rounded-full' : 'rounded'} font-bold inline-flex items-center justify-center ${className}`}
      style={{
        background: color ? `${color}15` : style.background,
        color: color || style.color,
        border: color ? `1px solid ${color}30` : style.border,
      }}
    >
      {children}
    </span>
  );
}
