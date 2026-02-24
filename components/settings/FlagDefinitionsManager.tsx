'use client';

import { useState } from 'react';
import type { Database } from '@/types/database';

const initialFlag = { name: '', description: '' };

type FlagDefinition = Database['public']['Tables']['device_flag_definitions']['Row'];

type Props = {
  initialDefinitions: FlagDefinition[];
};

export function FlagDefinitionsManager({ initialDefinitions }: Props) {
  const [definitions, setDefinitions] = useState(initialDefinitions);
  const [form, setForm] = useState(initialFlag);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const res = await fetch('/api/device-flags/definitions');
    if (!res.ok) return;
    const data = await res.json();
    setDefinitions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage('Name is required');
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/device-flags/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to create flag');
      return;
    }
    setForm(initialFlag);
    setMessage('Flag saved');
    refresh();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Existing flags</h2>
        {definitions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No flags created yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {definitions.map((flag) => (
              <li key={flag.id} className="py-2">
                <p className="font-semibold">{flag.name}</p>
                {flag.description && <p className="text-xs text-gray-500">{flag.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Add flag</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {message && <p className="text-sm text-primary">{message}</p>}
          <div>
            <label className="text-xs uppercase text-gray-500">Name</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Description</label>
            <textarea
              className="mt-1 w-full rounded border border-gray-300 p-2"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary py-2 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save flag'}
          </button>
        </form>
      </div>
    </div>
  );
}
