'use client';

import { useState } from 'react';
import type { Database } from '@/types/database';

type DeviceTypeDefinition = Database['public']['Tables']['device_type_definitions']['Row'];
type DeviceCategory = Database['public']['Tables']['devices']['Row']['type'];

type Props = {
  initialTypes: DeviceTypeDefinition[];
};

export function DeviceTypeManager({ initialTypes }: Props) {
  const [types, setTypes] = useState(initialTypes);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DeviceCategory>('PDA');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const res = await fetch('/api/device-types');
    if (!res.ok) return;
    const data = await res.json();
    setTypes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage('Name is required');
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/device-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to create device type');
      return;
    }
    setName('');
    setCategory('PDA');
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törlöd ezt a típust?')) return;
    const res = await fetch(`/api/device-types/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to delete device type');
      return;
    }
    refresh();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Device types</h2>
        {types.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No device types created yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {types.map((type) => (
              <li key={type.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold">{type.name}</p>
                  <p className="text-xs text-gray-500">{type.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(type.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Add device type</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {message && <p className="text-sm text-primary">{message}</p>}
          <div>
            <label className="text-xs uppercase text-gray-500">Name</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Category</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value as DeviceCategory)}
              required
            >
              <option value="PDA">PDA</option>
              <option value="MOBILE_PRINTER">Mobilprinter</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary py-2 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save device type'}
          </button>
        </form>
      </div>
    </div>
  );
}
