'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Database } from '@/types/database';

type Device = Database['public']['Tables']['devices']['Row'] & {
  holder?: { full_name: string | null; email: string | null } | null;
};

type Log = {
  id: string;
  action_type: Database['public']['Tables']['handover_logs']['Row']['action_type'];
  timestamp: string;
  from_profile?: { full_name: string | null } | null;
  to_profile?: { full_name: string | null } | null;
  batch?: {
    id: string | null;
    handover_number: number | null;
    signature_path: string | null;
    courier_signature_path: string | null;
    dispatcher_signature_path: string | null;
    notes: string | null;
    document_path: string | null;
    dispatcher?: { full_name: string | null } | null;
  } | null;
};

type FlagDefinition = Database['public']['Tables']['device_flag_definitions']['Row'];
type FlagValue = Database['public']['Tables']['device_flag_values']['Row'];
type FieldHistory = Database['public']['Tables']['device_history']['Row'];
type FlagHistory = Database['public']['Tables']['device_flag_history']['Row'] & {
  flag?: { name: string | null } | null;
};
type FlagStateEntry = { value: boolean; note: string };

const statuses: Device['status'][] = ['AVAILABLE', 'ISSUED', 'BROKEN', 'LOST', 'IN_SERVICE'];
const actionLabels: Record<'ISSUE' | 'RETURN', string> = {
  ISSUE: 'Check Out',
  RETURN: 'Check In'
};

interface Props {
  device: Device;
  logs: Log[];
  canEdit: boolean;
  customFlags: FlagDefinition[];
  flagValues: Pick<FlagValue, 'flag_id' | 'value' | 'note'>[];
  fieldHistory: FieldHistory[];
  flagHistory: FlagHistory[];
}

export function DeviceDetail({
  device,
  logs,
  canEdit,
  customFlags,
  flagValues,
  fieldHistory,
  flagHistory
}: Props) {
  const router = useRouter();
  const initialForm = useMemo(
    () => ({
      description: device.description ?? '',
      status: device.status,
      sim_card_id: device.sim_card_id ?? '',
      phone_number: device.phone_number ?? '',
      is_damaged: device.is_damaged,
      damage_note: device.damage_note ?? '',
      is_faulty: device.is_faulty,
      fault_note: device.fault_note ?? ''
    }),
    [device]
  );
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHandovers, setShowHandovers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computedFlagState = useMemo(() => {
    const initial: Record<string, FlagStateEntry> = {};
    customFlags.forEach((def) => {
      const existing = flagValues.find((fv) => fv.flag_id === def.id);
      initial[def.id] = { value: existing?.value ?? false, note: existing?.note ?? '' };
    });
    return initial;
  }, [customFlags, flagValues]);

  const [flagState, setFlagState] = useState<Record<string, FlagStateEntry>>(computedFlagState);
  useEffect(() => {
    setFlagState(computedFlagState);
    setForm(initialForm);
  }, [computedFlagState, initialForm]);

  useEffect(
    () => () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
      }
    },
    []
  );

  const openModal = (success: boolean, detail: string) => {
    setModalSuccess(success);
    setModalMessage(detail);
    setShowModal(true);
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
    }
    modalTimerRef.current = setTimeout(() => setShowModal(false), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.is_damaged && !form.damage_note.trim()) {
      setFormError('A sérülés leírása kötelező.');
      return;
    }
    if (form.is_faulty && !form.fault_note.trim()) {
      setFormError('A hiba leírása kötelező.');
      return;
    }
    setFormError(null);
    const payload = {
      ...form,
      customFlags: Object.entries(flagState).map(([flagId, entry]) => ({
        flagId,
        value: entry.value,
        note: entry.note?.trim() || null
      }))
    };
    const res = await fetch(`/api/devices/${device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      openModal(false, data.message || 'Ismeretlen hiba történt.');
      return;
    }
    openModal(true, 'Az eszköz adatai frissültek.');
    router.refresh();
  };

  const toggleCustomFlag = (flagId: string) => {
    setFlagState((prev) => {
      const next = { ...(prev[flagId] ?? { value: false, note: '' }) };
      next.value = !next.value;
      if (!next.value) {
        next.note = '';
      }
      return { ...prev, [flagId]: next };
    });
  };

  const updateFlagNote = (flagId: string, note: string) => {
    setFlagState((prev) => ({ ...prev, [flagId]: { ...(prev[flagId] ?? { value: false, note: '' }), note } }));
  };

  const activeFlags = useMemo(
    () => customFlags.filter((flag) => flagState[flag.id]?.value),
    [customFlags, flagState]
  );

  const combinedHistory = useMemo(() => {
    const fieldEntries = fieldHistory.map((entry) => ({
      id: entry.id,
      changed_at: entry.changed_at,
      label: formatFieldName(entry.field),
      value: `${entry.old_value ?? '—'} → ${entry.new_value ?? '—'}`
    }));
    const flagEntries = flagHistory.map((entry) => ({
      id: entry.id,
      changed_at: entry.changed_at,
      label: entry.flag?.name ?? 'Flag',
      value: `Value: ${entry.old_value === null ? '—' : String(entry.old_value)} → ${
        entry.new_value === null ? '—' : String(entry.new_value)
      }${entry.old_note || entry.new_note ? ` | Note: ${entry.old_note ?? '—'} → ${entry.new_note ?? '—'}` : ''}`
    }));
    return [...fieldEntries, ...flagEntries].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );
  }, [fieldHistory, flagHistory]);

  const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const isFlagDirty = useMemo(
    () => JSON.stringify(flagState) !== JSON.stringify(computedFlagState),
    [flagState, computedFlagState]
  );
  const isDirty = isFormDirty || isFlagDirty;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] pb-24">
      <div className="rounded bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-primary">{device.asset_tag}</h1>
          <StatusBadge value={device.status} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold">Type:</span> {device.type}
          </p>
          <p>
            <span className="font-semibold">Holder:</span> {device.holder?.full_name ?? 'Stock'}
          </p>
          <p>
            <span className="font-semibold">Updated:</span> {format(new Date(device.updated_at), 'PPpp')}
          </p>
          <div>
            <span className="font-semibold">Flags:</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {activeFlags.length === 0 && <span className="text-xs text-gray-500">No active flags</span>}
              {activeFlags.map((flag) => {
                const entry = flagState[flag.id];
                return (
                  <span
                    key={flag.id}
                    className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800"
                    title={entry?.note || flag.description || ''}
                  >
                    {flag.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        {canEdit && (
          <form id="device-form" onSubmit={handleSave} className="mt-6 space-y-4 pb-16">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-gray-500">SIM card ID</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.sim_card_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, sim_card_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Phone number</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                  value={form.phone_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500">Status</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 p-2"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Device['status'] }))}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  key: 'damaged',
                  label: 'Damaged',
                  checked: form.is_damaged,
                  note: form.damage_note,
                  onToggle: (checked: boolean) => setForm((prev) => ({ ...prev, is_damaged: checked })),
                  onNote: (value: string) => setForm((prev) => ({ ...prev, damage_note: value })),
                  placeholder: 'Describe the damage'
                },
                {
                  key: 'faulty',
                  label: 'Faulty',
                  checked: form.is_faulty,
                  note: form.fault_note,
                  onToggle: (checked: boolean) => setForm((prev) => ({ ...prev, is_faulty: checked })),
                  onNote: (value: string) => setForm((prev) => ({ ...prev, fault_note: value })),
                  placeholder: 'Describe the fault'
                }
              ].map((flag) => (
                <div key={flag.key} className="rounded border border-gray-200 p-3 text-xs space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-sm">
                    <input type="checkbox" checked={flag.checked} onChange={(e) => flag.onToggle(e.target.checked)} />
                    {flag.label}
                  </label>
                  {flag.checked && (
                    <textarea
                      className="w-full rounded border border-gray-300 p-2"
                      rows={2}
                      placeholder={flag.placeholder}
                      value={flag.note}
                      onChange={(e) => flag.onNote(e.target.value)}
                      required
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {customFlags.map((flag) => {
                const state = flagState[flag.id] ?? { value: false, note: '' };
                return (
                  <div key={flag.id} className="rounded border border-gray-200 p-3 text-xs space-y-2">
                    <label className="flex items-center gap-2 font-semibold text-sm">
                      <input type="checkbox" checked={state.value} onChange={() => toggleCustomFlag(flag.id)} />
                      {flag.name}
                    </label>
                    {state.value && (
                      <textarea
                        className="w-full rounded border border-gray-300 p-2"
                        rows={2}
                        placeholder="Add note (optional)"
                        value={state.note}
                        onChange={(e) => updateFlagNote(flag.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </form>
        )}
      </div>
      <div className="rounded bg-white p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold text-primary">History</h2>
        <div className="rounded border border-gray-200 p-3">
          <button
            type="button"
            onClick={() => setShowHandovers((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-semibold text-primary"
          >
            <span>Handovers</span>
            <span>{showHandovers ? '−' : '+'}</span>
          </button>
          {showHandovers && (
            <ul className="mt-3 space-y-3 text-sm">
              {logs.length === 0 && <p className="text-gray-500">No handovers logged yet.</p>}
              {logs.map((log) => (
                <li key={log.id} className="rounded border px-3 py-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{format(new Date(log.timestamp), 'PPpp')}</span>
                    <span>{actionLabels[log.action_type as 'ISSUE' | 'RETURN'] ?? log.action_type}</span>
                  </div>
                  <p>
                    {log.action_type === 'ISSUE'
                      ? `Checked out to ${log.to_profile?.full_name ?? 'unknown'}`
                      : `Checked in by ${log.from_profile?.full_name ?? 'unknown'}`}
                  </p>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
                    {log.batch?.handover_number && <p>Handover ID: #{log.batch.handover_number}</p>}
                    {log.batch?.dispatcher?.full_name && <p>Dispatcher: {log.batch.dispatcher.full_name}</p>}
                    {log.batch?.notes && <p>Note: {log.batch.notes}</p>}
                    <div className="flex flex-wrap gap-3">
                      {log.batch?.document_path ? (
                        <a href={log.batch.document_path} target="_blank" className="text-primary underline">
                          Dokumentum letöltése
                        </a>
                      ) : (
                        <span className="text-gray-400">Nincs dokumentum</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded border border-gray-200 p-3">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-semibold text-primary"
          >
            <span>Field changes</span>
            <span>{showHistory ? '−' : '+'}</span>
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2 text-xs">
              {combinedHistory.length === 0 ? (
                <p className="text-gray-500">No changes recorded.</p>
              ) : (
                combinedHistory.map((entry) => (
                  <div key={entry.id} className="rounded border px-3 py-2">
                    <div className="flex justify-between text-gray-500">
                      <span>{format(new Date(entry.changed_at), 'PPpp')}</span>
                      <span>{entry.label}</span>
                    </div>
                    <p>{entry.value}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isDirty ? 'bg-red-500' : 'bg-green-500'}`}
                aria-hidden
              ></span>
              <p className={isDirty ? 'text-red-600' : 'text-green-600'}>
                {isDirty ? 'Változások nincsenek mentve' : 'Minden mentve'}
              </p>
            </div>
            <button
              form="device-form"
              type="submit"
              disabled={!isDirty}
              className="rounded bg-primary px-5 py-2 text-white font-semibold disabled:opacity-50"
            >
              Mentés
            </button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white px-6 py-6 text-center shadow-2xl">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                modalSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {modalSuccess ? <CheckIcon className="h-8 w-8" /> : <XIcon className="h-8 w-8" />}
            </div>
            <p className="mt-4 text-lg font-semibold">
              {modalSuccess ? 'Sikeres mentés' : 'Sikertelen mentés'}
            </p>
            <p className="mt-2 text-sm text-gray-600">{modalMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFieldName(field: string) {
  const map: Record<string, string> = {
    asset_tag: 'Asset tag',
    type: 'Type',
    description: 'Description',
    status: 'Status',
    current_holder_id: 'Holder',
    sim_card_id: 'SIM ID',
    phone_number: 'Phone number',
    is_damaged: 'Damaged',
    damage_note: 'Damage note',
    is_faulty: 'Faulty',
    fault_note: 'Fault note'
  };
  return map[field] ?? field;
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
