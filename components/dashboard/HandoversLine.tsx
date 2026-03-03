'use client';

import { useMemo, useState } from 'react';
import type { HandoverDaily } from '@/components/dashboard/mockData';

type Props = {
  data: HandoverDaily[];
  showMovingAverage?: boolean;
};

type Point = { x: number; y: number; value: number; date: string; avg: number };

export function HandoversLine({ data, showMovingAverage = true }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const sorted = useMemo(() => [...data].sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const points = useMemo(() => {
    const max = Math.max(...sorted.map((item) => item.issuedCount), 1);
    const width = 560;
    const height = 200;
    const paddingX = 30;
    const paddingY = 20;
    return sorted.map((item, index) => {
      const start = Math.max(0, index - 6);
      const slice = sorted.slice(start, index + 1);
      const avg = slice.reduce((sum, entry) => sum + entry.issuedCount, 0) / slice.length;
      const x = paddingX + (index / Math.max(sorted.length - 1, 1)) * (width - paddingX * 2);
      const y = height - paddingY - (item.issuedCount / max) * (height - paddingY * 2);
      return { x, y, value: item.issuedCount, date: item.date, avg };
    });
  }, [sorted]);

  const avgPoints = points.map((point) => ({
    ...point,
    y:
      200 -
      20 -
      (point.avg / Math.max(...points.map((p) => p.value), 1)) * (200 - 20 * 2)
  }));

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const avgPolyline = avgPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const ticks = points.filter((_, index) => index % Math.max(Math.floor(points.length / 4), 1) === 0);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const index = Math.round((relativeX / rect.width) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  const handleLeave = () => setHoverIndex(null);

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Handovers over time</h3>
        <span className="text-xs text-slate-400">Issued per day</span>
      </div>
      <div className="relative mt-4" onMouseMove={handleMove} onMouseLeave={handleLeave}>
        <svg viewBox="0 0 560 200" className="h-64 w-full">
          <g>
            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                x1={30}
                x2={530}
                y1={20 + line * 45}
                y2={20 + line * 45}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
            ))}
          </g>
          <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={polyline} />
          {showMovingAverage && (
            <polyline fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" points={avgPolyline} />
          )}
          {ticks.map((tick) => (
            <text
              key={tick.date}
              x={tick.x}
              y={190}
              textAnchor="middle"
              className="fill-slate-400 text-[12px]"
            >
              {tick.date.slice(5)}
            </text>
          ))}
          {activePoint && (
            <circle cx={activePoint.x} cy={activePoint.y} r={4} fill="#2563eb" stroke="#fff" strokeWidth={2} />
          )}
        </svg>
        {activePoint && (
          <div
            className="absolute rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow"
            style={{
              left: `${(activePoint.x / 560) * 100}%`,
              top: `${(activePoint.y / 200) * 100}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <p className="font-semibold">{activePoint.date}</p>
            <p>Issued: {activePoint.value}</p>
          </div>
        )}
      </div>
    </div>
  );
}
