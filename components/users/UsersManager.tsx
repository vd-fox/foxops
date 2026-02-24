'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type RoleFilter = 'ALL' | 'ADMIN' | 'COURIER';

const roleLabels: Record<RoleFilter, string> = {
  ALL: 'All',
  ADMIN: 'Admin',
  COURIER: 'Courier'
};

export function UsersManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [filter, setFilter] = useState<RoleFilter>('ALL');
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'ADMIN' as Profile['role'],
    password: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const visibleProfiles = useMemo(
    () => profiles.filter((p) => (filter === 'ALL' ? true : p.role === filter)),
    [profiles, filter]
  );

  const refresh = async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const next = await res.json();
      setProfiles(next);
      router.refresh();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (form.role === 'COURIER' && !/^\d{4}$/.test(form.pin)) {
      setLoading(false);
      setMessage('PIN must be exactly 4 digits');
      return;
    }
    const payload: {
      full_name: string;
      email?: string;
      role: Profile['role'];
      password?: string;
      pin?: string;
    } = {
      full_name: form.full_name,
      role: form.role,
      pin: form.role === 'COURIER' ? form.pin : undefined
    };
    if (form.role === 'ADMIN') {
      payload.email = form.email;
      payload.password = form.password;
    }
    if (form.role === 'ADMIN') {
      payload.password = form.password;
    }

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message || 'Failed to create user');
      return;
    }
    setForm({ full_name: '', email: '', role: 'ADMIN', password: '', pin: '' });
    setMessage('User created');
    await refresh();
  };

  const toggleActive = async (profile: Profile) => {
    const res = await fetch(`/api/users/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !profile.active })
    });
    if (!res.ok) return;
    await refresh();
  };

  const resetPin = async (profile: Profile) => {
    const pin = prompt('Enter a 4-6 digit PIN');
    if (!pin) return;
    if (!/^\d{4,6}$/.test(pin)) {
      alert('PIN must be 4-6 digits');
      return;
    }
    const res = await fetch(`/api/users/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (res.ok) {
      alert('PIN updated');
      await refresh();
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(roleLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as RoleFilter)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                filter === value ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((profile) => (
                <tr key={profile.id} className="border-b last:border-none">
                  <td className="py-2 font-medium">{profile.full_name}</td>
                  <td className="text-xs text-gray-500">{profile.email}</td>
                  <td>{profile.role}</td>
                  <td>
                    <span className={`text-xs font-semibold ${profile.active ? 'text-green-600' : 'text-red-600'}`}>
                      {profile.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="space-x-2 text-right text-xs">
                    <Link href={`/users/${profile.id}`} className="text-primary">
                      View
                    </Link>
                    <button className="text-primary" onClick={() => toggleActive(profile)}>
                      {profile.active ? 'Disable' : 'Activate'}
                    </button>
                    {profile.role === 'COURIER' && (
                      <button className="text-accent" onClick={() => resetPin(profile)}>
                        Set PIN
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-primary">Create user</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          {message && <p className="text-sm text-primary">{message}</p>}
          <div>
            <label className="text-xs uppercase text-gray-500">Full name</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </div>
          {form.role === 'COURIER' && (
            <div>
              <label className="text-xs uppercase text-gray-500">PIN (exactly 4 digits)</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.pin}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setForm((prev) => ({ ...prev, pin: next }));
                }}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
              />
            </div>
          )}
          {form.role === 'ADMIN' && (
            <div>
              <label className="text-xs uppercase text-gray-500">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          )}
          {form.role === 'ADMIN' ? (
            <div>
              <label className="text-xs uppercase text-gray-500">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs uppercase text-gray-500">Role</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as Profile['role'] }))}
            >
              <option value="ADMIN">Admin</option>
              <option value="COURIER">Courier</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary py-2 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </div>
    </div>
  );
}
