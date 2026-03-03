'use client';

import type { DeviceTypeCount } from '@/components/dashboard/mockData';

type Props = {
  data: DeviceTypeCount[];
};

export function DeviceTypeBars({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((item) => item.count), 1);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Device type counts</h3>
        <span className="text-xs text-slate-400">Sorted by volume</span>
      </div>
      <div className="mt-4 space-y-3">
        {sorted.map((item) => {
          const width = Math.round((item.count / max) * 100);
          return (
            <div key={item.type} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium text-slate-600">{item.type}</span>
              <div className="relative h-3 flex-1 rounded-full bg-slate-100">
                <div
                  className="absolute left-0 top-0 h-3 rounded-full bg-blue-600"
                  style={{ width: `${width}%` }}
                  title={`${item.type}: ${item.count}`}
                />
              </div>
              <span className="w-10 text-right text-xs text-slate-500">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
