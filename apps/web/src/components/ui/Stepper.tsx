'use client';

interface StepperProps {
  totalSteps: number;
  currentStep: number;
  variant?: 'dots' | 'circles';
  labels?: string[];
  className?: string;
}

export default function Stepper({
  totalSteps,
  currentStep,
  variant = 'circles',
  labels,
  className = '',
}: StepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center gap-1 ${className}`}>
        {steps.map((s) => (
          <div
            key={s}
            className="h-1 rounded-full transition-all"
            style={{
              width: s === currentStep ? '24px' : '12px',
              background: s <= currentStep ? 'var(--accent-warm)' : 'var(--border-card)',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
            style={{
              background: s < currentStep ? 'var(--accent-green)' : s === currentStep ? 'var(--accent-warm)' : 'var(--bg-card)',
              color: s <= currentStep ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${s < currentStep ? 'var(--accent-green)' : s === currentStep ? 'var(--accent-warm)' : 'var(--border-card)'}`,
            }}
          >
            {s < currentStep ? '✓' : labels?.[i] ?? s}
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-8 h-0.5 rounded"
              style={{
                background: s < currentStep ? 'var(--accent-green)' : 'var(--border-card)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
