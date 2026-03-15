'use client';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  color,
  height = '8px',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={className}>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ background: 'var(--bg-card)', height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped}%`,
            background: color || 'var(--gradient-green)',
          }}
        />
      </div>
      {showLabel && (
        <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
          {Math.round(clamped)}%
        </p>
      )}
    </div>
  );
}
