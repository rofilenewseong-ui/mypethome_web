'use client';

interface FormFieldProps {
  label: string;
  icon?: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
  className?: string;
}

export default function FormField({
  label,
  icon,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  multiline,
  error,
  className = '',
}: FormFieldProps) {
  const filled = value.length > 0;
  const inputStyle = {
    background: 'var(--bg-input)',
    border: `1px solid ${error ? 'var(--accent-red)' : filled ? 'rgba(100, 200, 255, 0.25)' : 'var(--border-input)'}`,
    color: 'var(--text-primary)',
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        {required && (
          <span className="text-[9px] font-bold" style={{ color: 'var(--accent-red)' }}>
            필수
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-[var(--radius-sm)] px-3.5 py-3 text-[13px] outline-none resize-none placeholder:text-[var(--text-muted)]"
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius-sm)] px-3.5 py-3 text-[13px] outline-none placeholder:text-[var(--text-muted)]"
          style={inputStyle}
        />
      )}
      {error && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--accent-red)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
