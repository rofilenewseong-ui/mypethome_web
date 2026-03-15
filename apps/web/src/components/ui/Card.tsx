'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] p-4 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        ...(hover && onClick
          ? {}
          : {}),
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = 'rgba(178, 150, 125, 0.3)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = 'var(--border-card)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
}
