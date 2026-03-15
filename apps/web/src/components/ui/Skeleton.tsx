'use client';

interface SkeletonProps {
  variant?: 'rect' | 'circle';
  height?: string;
  width?: string;
  count?: number;
  className?: string;
}

export default function Skeleton({
  variant = 'rect',
  height,
  width,
  count = 1,
  className = '',
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const baseClass = `animate-pulse ${
    variant === 'circle' ? 'rounded-full' : 'rounded-[var(--radius-md)]'
  } ${className}`;

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={baseClass}
          style={{
            background: 'var(--bg-card)',
            height: height || (variant === 'circle' ? '40px' : '20px'),
            width: width || (variant === 'circle' ? height || '40px' : '100%'),
          }}
        />
      ))}
    </>
  );
}
