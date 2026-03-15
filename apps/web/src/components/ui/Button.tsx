'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

const variants = {
  primary: {
    background: 'var(--accent-warm)',
    color: 'var(--text-inverse)',
    border: 'none',
  },
  secondary: {
    background: 'rgba(74, 52, 42, 0.06)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-card)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
  },
  danger: {
    background: 'var(--accent-red)',
    color: '#fff',
    border: 'none',
  },
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button',
}: ButtonProps) {
  const style = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        rounded-[var(--radius-sm)] font-bold transition-all duration-200
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'}
        ${className}
      `}
      style={{
        ...style,
        ...(disabled ? { background: 'rgba(74, 52, 42, 0.06)', color: 'var(--text-muted)' } : {}),
      }}
    >
      {loading ? (
        <span className="animate-pulse-warm">처리 중...</span>
      ) : (
        children
      )}
    </button>
  );
}
