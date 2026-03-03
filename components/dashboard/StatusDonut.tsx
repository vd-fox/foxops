'use client';

import type { Totals } from '@/components/dashboard/mockData';

type Props = {
  totals: Totals;
};

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7'];

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

export function StatusDonut({ totals }: Props) {
  const data = [
    { name: 'Available', value: totals.available },
    { name: 'Issued', value: totals.issued },
    { name: 'Broken / Lost', value: totals.brokenLost },
    { name: 'In service', value: totals.inService }
  ];
  const total = totals.totalDevices || data.reduce((sum, item) => sum + item.value, 0) || 1;
  const fleetHealth = Math.round(((totals.available + totals.issued) / total) * 100);
  const radius = 76;
  const stroke = 18;
  const center = 100;
  const gap = 1.5;
  let currentAngle = 0;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Status distribution</h3>
        <span className="text-xs text-slate-400">Last update: just now</span>
      </div>
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="relative h-[220px] w-[220px]">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
            {data.map((item, index) => {
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle + gap / 2;
              const endAngle = currentAngle + angle - gap / 2;
              currentAngle += angle;
              if (angle <= 0) return null;
              const percent = ((item.value / total) * 100).toFixed(1);
              const path = describeArc(center, center, radius, startAngle, endAngle);
              return (
                <path
                  key={item.name}
                  d={path}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="butt"
                  aria-label={`${item.name}: ${item.value} (${percent}%)`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fleet Health</p>
            <p className="text-2xl font-semibold text-slate-900">{fleetHealth}%</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
          {data.map((item, index) => {
            const percent = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span>{item.name}</span>
                <span className="ml-auto text-slate-400">
                  {item.value} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
