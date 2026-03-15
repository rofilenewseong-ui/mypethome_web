'use client';

interface ListItemProps {
  icon?: string;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ListItem({
  icon,
  label,
  description,
  trailing,
  onClick,
  className = '',
}: ListItemProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`w-full flex items-center justify-between py-2 ${onClick ? '' : ''} ${className}`}
      {...(onClick ? {} : {})}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <div>
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </span>
          {description && (
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {trailing !== undefined ? (
        trailing
      ) : onClick ? (
        <span style={{ color: 'var(--text-muted)' }}>&rsaquo;</span>
      ) : null}
    </Component>
  );
}
