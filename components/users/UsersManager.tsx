'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type SiteDefinition = Database['public']['Tables']['site_definitions']['Row'];

type RoleFilter = 'ALL' | 'ADMIN' | 'COURIER';

const roleLabels: Record<RoleFilter, string> = {
  ALL: 'All',
  ADMIN: 'Admin',
  COURIER: 'Courier'
};

export function UsersManager({
  initialProfiles,
  initialSites
}: {
  initialProfiles: Profile[];
  initialSites: SiteDefinition[];
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [sites] = useState(initialSites);
  const [filter, setFilter] = useState<RoleFilter>('ALL');
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    user_type: 'ADMIN' as 'ADMIN' | 'CONTRACTOR' | 'EMPLOYEE',
    full_name: '',
    email: '',
    password: '',
    company_name: '',
    vat_number: '',
    company_number: '',
    representative_first_name: '',
    representative_last_name: '',
    representative_email: '',
    representative_phone: '',
    first_name: '',
    last_name: '',
    employee_email: '',
    employee_phone: '',
    employee_id: '',
    position: '',
    site_id: '',
    pin: ''
  });
  const [employeeEmailTouched, setEmployeeEmailTouched] = useState(false);
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

  const normalizeEmailPart = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '.')
      .toLowerCase();

  const buildCourierEmail = (first: string, last: string) => {
    const firstPart = normalizeEmailPart(first);
    const lastPart = normalizeEmailPart(last);
    if (!firstPart || !lastPart) return '';
    return `${firstPart}.${lastPart}@foxpost.hu`;
  };

  useEffect(() => {
    if (form.user_type !== 'EMPLOYEE') return;
    if (employeeEmailTouched) return;
    const nextEmail = buildCourierEmail(form.first_name, form.last_name);
    setForm((prev) => ({ ...prev, employee_email: nextEmail }));
  }, [form.user_type, form.first_name, form.last_name, employeeEmailTouched]);

  useEffect(() => {
    setEmployeeEmailTouched(false);
  }, [form.user_type]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (form.user_type !== 'ADMIN' && !/^\d{4}$/.test(form.pin)) {
      setLoading(false);
      setMessage('PIN must be exactly 4 digits');
      return;
    }

    let payload: Record<string, unknown> = { user_type: form.user_type };

    if (form.user_type === 'ADMIN') {
      if (!form.full_name || !form.email || !form.password) {
        setLoading(false);
        setMessage('Missing fields');
        return;
      }
      payload = {
        ...payload,
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        site_id: form.site_id || null
      };
    }

    if (form.user_type === 'CONTRACTOR') {
      const requiredFields = [
        form.company_name,
        form.vat_number,
        form.company_number,
        form.representative_first_name,
        form.representative_last_name,
        form.representative_email,
        form.representative_phone
      ];
      if (requiredFields.some((value) => !value.trim())) {
        setLoading(false);
        setMessage('Missing fields');
        return;
      }
      payload = {
        ...payload,
        company_name: form.company_name,
        vat_number: form.vat_number,
        company_number: form.company_number,
        representative_first_name: form.representative_first_name,
        representative_last_name: form.representative_last_name,
        representative_email: form.representative_email,
        representative_phone: form.representative_phone,
        site_id: form.site_id || null,
        pin: form.pin
      };
    }

    if (form.user_type === 'EMPLOYEE') {
      const requiredFields = [
        form.first_name,
        form.last_name,
        form.employee_email,
        form.employee_phone,
        form.employee_id,
        form.position
      ];
      if (requiredFields.some((value) => !value.trim())) {
        setLoading(false);
        setMessage('Missing fields');
        return;
      }
      payload = {
        ...payload,
        first_name: form.first_name,
        last_name: form.last_name,
        employee_email: form.employee_email,
        employee_phone: form.employee_phone,
        employee_id: form.employee_id,
        position: form.position,
        site_id: form.site_id || null,
        pin: form.pin
      };
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
    setForm({
      user_type: 'ADMIN',
      full_name: '',
      email: '',
      password: '',
      company_name: '',
      vat_number: '',
      company_number: '',
      representative_first_name: '',
      representative_last_name: '',
      representative_email: '',
      representative_phone: '',
      first_name: '',
      last_name: '',
      employee_email: '',
      employee_phone: '',
      employee_id: '',
      position: '',
      site_id: '',
      pin: ''
    });
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
            <label className="text-xs uppercase text-gray-500">User type</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 p-2"
              value={form.user_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, user_type: e.target.value as 'ADMIN' | 'CONTRACTOR' | 'EMPLOYEE' }))
              }
            >
              <option value="ADMIN">Admin</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="EMPLOYEE">Courier</option>
            </select>
          </div>
          {form.user_type === 'ADMIN' && (
            <>
              <div>
                <label className="text-xs uppercase text-gray-500">Full name</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Site</label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.site_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, site_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
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
            </>
          )}
          {form.user_type === 'CONTRACTOR' && (
            <>
              <div>
                <label className="text-xs uppercase text-gray-500">Company name</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.company_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Site</label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.site_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, site_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Vat number</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.vat_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, vat_number: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Company number</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.company_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_number: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Representative firstname</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.representative_first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, representative_first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Representative lastname</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.representative_last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, representative_last_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Representative email address</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.representative_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, representative_email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Representative phone number</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.representative_phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, representative_phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">PIN code (4 digits)</label>
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
              <p className="text-xs text-gray-500">
                Login email will be set to the representative email address.
              </p>
            </>
          )}
          {form.user_type === 'EMPLOYEE' && (
            <>
              <div>
                <label className="text-xs uppercase text-gray-500">First name</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Site</label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.site_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, site_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Last name</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Email address</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.employee_email}
                  onChange={(e) => {
                    setEmployeeEmailTouched(true);
                    setForm((prev) => ({ ...prev, employee_email: e.target.value }));
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Phone number</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.employee_phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, employee_phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Employee ID</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.employee_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Position</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.position}
                  onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">PIN code (4 digits)</label>
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
              <p className="text-xs text-gray-500">
                Email auto-filled from name, but you can edit it if needed.
              </p>
            </>
          )}
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
