'use client';

type Props = {
  label: string;
  value: number;
  threshold: number;
  caption: string;
  color: string;
};

export function UtilizationKpi({ label, value, threshold, caption, color }: Props) {
  const percent = Math.round(value * 100);
  const thresholdPercent = Math.round(threshold * 100);
  const ringBackground = `conic-gradient(${color} ${percent}%, #e2e8f0 ${percent}% 100%)`;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{ background: ringBackground }}
        aria-label={`${label} ${percent}%`}
      >
        <div className="h-20 w-20 rounded-full bg-white"></div>
        <div className="absolute text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-900">{percent}%</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{caption}</p>
      <p className="text-[11px] text-slate-400">Threshold: {thresholdPercent}%</p>
    </div>
  );
}
