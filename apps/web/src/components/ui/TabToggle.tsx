'use client';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabToggleProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  variant?: 'filled' | 'pill';
  className?: string;
}

export default function TabToggle({
  tabs,
  activeTab,
  onChange,
  variant = 'filled',
  className = '',
}: TabToggleProps) {
  if (variant === 'pill') {
    return (
      <div
        className={`flex gap-1 p-1 rounded-[var(--radius-md)] ${className}`}
        style={{ background: 'rgba(178,150,125,0.08)', border: '1px solid var(--border-card)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-bold transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-card)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex rounded-[var(--radius-sm)] overflow-hidden ${className}`}
      style={{ border: '1px solid var(--border-card)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className="flex-1 py-2.5 text-xs font-bold transition-all"
          style={{
            background: activeTab === tab.key ? 'var(--accent-warm)' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 text-[9px]">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
