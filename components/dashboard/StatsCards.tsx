'use client';

import type { Totals } from '@/components/dashboard/mockData';

type Props = {
  totals: Totals;
};

export function StatsCards({ totals }: Props) {
  const stats = [
    { label: 'Total devices', value: totals.totalDevices, accent: 'text-slate-900' },
    { label: 'Available', value: totals.available, accent: 'text-emerald-600' },
    { label: 'Issued', value: totals.issued, accent: 'text-blue-600' },
    { label: 'Broken / Lost', value: totals.brokenLost, accent: 'text-rose-600' },
    { label: 'In service', value: totals.inService, accent: 'text-amber-600' }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${stat.accent}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
