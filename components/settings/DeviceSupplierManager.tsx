'use client';

import { useState } from 'react';
import type { Database } from '@/types/database';

type DeviceSupplierDefinition = Database['public']['Tables']['device_supplier_definitions']['Row'];

type Props = {
  initialSuppliers: DeviceSupplierDefinition[];
};

export function DeviceSupplierManager({ initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const res = await fetch('/api/device-suppliers');
    if (!res.ok) return;
    const data = await res.json();
    setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage('Name is required');
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/device-suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to create supplier');
      return;
    }
    setName('');
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törlöd ezt a beszállítót?')) return;
    const res = await fetch(`/api/device-suppliers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to delete supplier');
      return;
    }
    refresh();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Suppliers</h2>
        {suppliers.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No suppliers created yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="flex items-center justify-between py-2">
                <span className="font-semibold">{supplier.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(supplier.id)}
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
        <h2 className="text-lg font-semibold text-primary">Add supplier</h2>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary py-2 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save supplier'}
          </button>
        </form>
      </div>
    </div>
  );
}
