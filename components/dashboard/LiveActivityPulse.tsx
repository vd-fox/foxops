'use client';

import { useEffect, useState } from 'react';

type Props = {
  pulseToken: number;
  lastEventLabel?: string;
};

export function LiveActivityPulse({ pulseToken, lastEventLabel }: Props) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulseToken === 0) return;
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 1200);
    return () => clearTimeout(timer);
  }, [pulseToken]);

  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Live activity</span>
        <span className="text-xs font-semibold text-slate-700">{lastEventLabel || 'Idle'}</span>
      </div>
      <div className="relative h-6 w-20">
        <svg viewBox="0 0 100 24" className="h-full w-full">
          <path
            d="M0 12 H28 L34 4 L40 20 L46 12 H100"
            className={isPulsing ? 'pulse-path' : 'idle-path'}
          />
        </svg>
        {isPulsing && <span className="pulse-dot" />}
      </div>
      <style jsx>{`
        .idle-path {
          stroke: #94a3b8;
          stroke-width: 2;
          fill: none;
          opacity: 0.4;
        }
        .pulse-path {
          stroke: #22c55e;
          stroke-width: 2.2;
          fill: none;
          stroke-dasharray: 140;
          stroke-dashoffset: 140;
          animation: dash 1.1s ease forwards;
        }
        .pulse-dot {
          position: absolute;
          right: 4px;
          top: 6px;
          height: 8px;
          width: 8px;
          border-radius: 999px;
          background: #22c55e;
          animation: ping 1.1s ease;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes ping {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          70% {
            transform: scale(1.6);
            opacity: 0.2;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
