'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Database } from '@/types/database';

const statuses: Database['public']['Tables']['devices']['Row']['status'][] = [
  'AVAILABLE',
  'ISSUED',
  'BROKEN',
  'LOST',
  'IN_SERVICE'
];

const types: Database['public']['Tables']['devices']['Row']['type'][] = ['PDA', 'MOBILE_PRINTER'];

type DeviceRow = Pick<Database['public']['Tables']['devices']['Row'], 'id' | 'asset_tag' | 'type' | 'status'> & {
  profiles?: { full_name: string | null } | null;
};

export function DeviceManager({ devices, canEdit }: { devices: DeviceRow[]; canEdit: boolean }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [form, setForm] = useState({ asset_tag: '', type: 'PDA', description: '' });
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    return devices.filter((device) => {
      const matchesQuery = device.asset_tag.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || device.type === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [devices, query, statusFilter, typeFilter]);

  const createDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message || 'Failed to create device');
      return;
    }
    setForm({ asset_tag: '', type: 'PDA', description: '' });
    setMessage('Device created');
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded bg-white p-4 shadow">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="flex-1 rounded border border-gray-300 p-2"
            placeholder="Search asset tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded border border-gray-300 p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-gray-300 p-2"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2">Asset Tag</th>
                <th>Type</th>
                <th>Status</th>
                <th>Holder</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((device) => (
                <tr key={device.id} className="border-b last:border-none">
                  <td className="py-2 font-medium">{device.asset_tag}</td>
                  <td>{device.type}</td>
                  <td>
                    <StatusBadge value={device.status} />
                  </td>
                  <td className="text-xs text-gray-500">{device.profiles?.full_name ?? '—'}</td>
                  <td className="text-right text-xs">
                    <a className="text-primary" href={`/devices/${device.id}`}>
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {canEdit && (
        <div className="rounded bg-white p-4 shadow">
          <h2 className="text-lg font-semibold text-primary">Add device</h2>
          <form onSubmit={createDevice} className="mt-4 space-y-3">
            {message && <p className="text-sm text-primary">{message}</p>}
            <div>
              <label className="text-xs uppercase text-gray-500">Asset tag</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.asset_tag}
                onChange={(e) => setForm((prev) => ({ ...prev, asset_tag: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Type</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value as DeviceRow['type'] }))
                }
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Description</label>
              <textarea
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <button type="submit" className="w-full rounded bg-primary py-2 text-white font-semibold">
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
