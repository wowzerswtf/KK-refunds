'use client';

interface Step {
  label: string;
  status: 'pending' | 'active' | 'complete';
}

interface StepIndicatorProps {
  steps: Step[];
}

export default function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                step.status === 'complete'
                  ? 'bg-[#22c55e] text-white'
                  : step.status === 'active'
                  ? 'bg-[#2563eb] text-white ring-2 ring-[#2563eb]/50 ring-offset-2 ring-offset-[#0a0a0f]'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              {step.status === 'complete' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step.status === 'active' ? 'text-white' : step.status === 'complete' ? 'text-[#22c55e]' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-4 h-px w-16 ${
                step.status === 'complete' ? 'bg-[#22c55e]' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
