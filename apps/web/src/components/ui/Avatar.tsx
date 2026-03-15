'use client';

interface AvatarProps {
  src?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-7 h-7', text: 'text-sm', dot: 'w-2 h-2' },
  sm: { container: 'w-9 h-9', text: 'text-lg', dot: 'w-2.5 h-2.5' },
  md: { container: 'w-12 h-12', text: 'text-xl', dot: 'w-3 h-3' },
  lg: { container: 'w-14 h-14', text: 'text-2xl', dot: 'w-3.5 h-3.5' },
  xl: { container: 'w-16 h-16', text: 'text-2xl', dot: 'w-4 h-4' },
};

export default function Avatar({
  src,
  fallback = '🐾',
  size = 'md',
  online,
  className = '',
}: AvatarProps) {
  const s = sizeMap[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${s.container} rounded-full flex items-center justify-center ${s.text} overflow-hidden`}
        style={{
          background: 'var(--accent-warm-bg)',
          border: '2px solid var(--border-card)',
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          fallback
        )}
      </div>
      {online !== undefined && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full`}
          style={{
            background: online ? 'var(--accent-green)' : 'var(--text-muted)',
            border: '2px solid var(--bg-warm)',
          }}
        />
      )}
    </div>
  );
}
