'use client';

import { useEffect, useMemo, useState } from 'react';
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

type DeviceTypeDefinition = Database['public']['Tables']['device_type_definitions']['Row'];
type DeviceSupplierDefinition = Database['public']['Tables']['device_supplier_definitions']['Row'];

export function DeviceManager({
  devices,
  canEdit,
  deviceTypes,
  suppliers
}: {
  devices: DeviceRow[];
  canEdit: boolean;
  deviceTypes: DeviceTypeDefinition[];
  suppliers: DeviceSupplierDefinition[];
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const defaultDeviceType = deviceTypes[0]?.id ?? '';
  const defaultSupplier = suppliers[0]?.id ?? '';
  const [form, setForm] = useState({
    asset_tag: '',
    serial_number: '',
    type: 'PDA',
    device_type_id: defaultDeviceType,
    supplier_id: defaultSupplier,
    insurance: false,
    insurance_valid_until: '',
    tss: false,
    tss_valid_until: '',
    description: ''
  });
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const filteredDeviceTypes = useMemo(
    () => deviceTypes.filter((deviceType) => deviceType.category === form.type),
    [deviceTypes, form.type]
  );

  useEffect(() => {
    if (!filteredDeviceTypes.length) {
      setForm((prev) => ({ ...prev, device_type_id: '' }));
      return;
    }
    if (!filteredDeviceTypes.some((deviceType) => deviceType.id === form.device_type_id)) {
      setForm((prev) => ({ ...prev, device_type_id: filteredDeviceTypes[0].id }));
    }
  }, [filteredDeviceTypes, form.device_type_id]);

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
    if (!form.asset_tag.trim() || !form.serial_number.trim()) {
      setMessage('Asset tag and serial number are required');
      return;
    }
    if (!form.device_type_id) {
      setMessage('Device type is required');
      return;
    }
    if (!form.supplier_id) {
      setMessage('Supplier is required');
      return;
    }
    if (form.insurance && !form.insurance_valid_until) {
      setMessage('Insurance valid until is required');
      return;
    }
    if (form.tss && !form.tss_valid_until) {
      setMessage('TSS valid until is required');
      return;
    }
    const payload = {
      ...form,
      asset_tag: form.asset_tag.trim(),
      serial_number: form.serial_number.trim(),
      insurance_valid_until: form.insurance ? form.insurance_valid_until : null,
      tss_valid_until: form.tss ? form.tss_valid_until : null
    };
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.message || 'Failed to create device');
      return;
    }
    setForm({
      asset_tag: '',
      serial_number: '',
      type: 'PDA',
      device_type_id: defaultDeviceType,
      supplier_id: defaultSupplier,
      insurance: false,
      insurance_valid_until: '',
      tss: false,
      tss_valid_until: '',
      description: ''
    });
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
              <label className="text-xs uppercase text-gray-500">Serial number</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.serial_number}
                onChange={(e) => setForm((prev) => ({ ...prev, serial_number: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Category</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as DeviceRow['type'];
                  setForm((prev) => ({
                    ...prev,
                    type: nextType,
                    tss: nextType === 'MOBILE_PRINTER' ? false : prev.tss,
                    tss_valid_until: nextType === 'MOBILE_PRINTER' ? '' : prev.tss_valid_until
                  }));
                }}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Device type</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.device_type_id}
                onChange={(e) => setForm((prev) => ({ ...prev, device_type_id: e.target.value }))}
                required
              >
                {filteredDeviceTypes.length === 0 && (
                  <option value="" disabled>
                    No device types
                  </option>
                )}
                {filteredDeviceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Supplier</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.supplier_id}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier_id: e.target.value }))}
                required
              >
                {suppliers.length === 0 && (
                  <option value="" disabled>
                    No suppliers
                  </option>
                )}
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Insurance</label>
              <div className="mt-1 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="insurance"
                    checked={form.insurance}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, insurance: true }))
                    }
                  />
                  Igen
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="insurance"
                    checked={!form.insurance}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, insurance: false, insurance_valid_until: '' }))
                    }
                  />
                  Nem
                </label>
              </div>
              {form.insurance && (
                <input
                  type="date"
                  className="mt-2 w-full rounded border border-gray-300 p-2"
                  value={form.insurance_valid_until}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, insurance_valid_until: e.target.value }))
                  }
                  required
                />
              )}
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">TSS</label>
              {form.type === 'MOBILE_PRINTER' ? (
                <p className="mt-2 text-xs text-gray-500">TSS nem elérhető mobil printerhez.</p>
              ) : (
                <>
                  <div className="mt-1 flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tss"
                        checked={form.tss}
                        onChange={() => setForm((prev) => ({ ...prev, tss: true }))}
                      />
                      Igen
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tss"
                        checked={!form.tss}
                        onChange={() => setForm((prev) => ({ ...prev, tss: false, tss_valid_until: '' }))}
                      />
                      Nem
                    </label>
                  </div>
                  {form.tss && (
                    <input
                      type="date"
                      className="mt-2 w-full rounded border border-gray-300 p-2"
                      value={form.tss_valid_until}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tss_valid_until: e.target.value }))
                      }
                      required
                    />
                  )}
                </>
              )}
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
