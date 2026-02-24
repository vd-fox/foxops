import { ReactNode } from 'react';

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}
