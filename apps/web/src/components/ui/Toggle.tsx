'use client';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: { track: 'w-8 h-[18px]', thumb: 'w-[14px] h-[14px]', on: '16px', off: '2px' },
  md: { track: 'w-10 h-[22px]', thumb: 'w-[18px] h-[18px]', on: '20px', off: '2px' },
};

export default function Toggle({
  enabled,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  const s = sizeMap[size];

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`${s.track} rounded-full relative transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: enabled ? 'var(--accent-green)' : 'rgba(74, 52, 42, 0.15)' }}
    >
      <div
        className={`absolute ${s.thumb} rounded-full bg-white top-[2px] transition-all duration-200`}
        style={{ left: enabled ? s.on : s.off }}
      />
    </button>
  );
}
