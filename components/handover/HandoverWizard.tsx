'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';
import { PinPad } from '@/components/handover/PinPad';
import { SignaturePad } from '@/components/handover/SignaturePad';

type Courier = Database['public']['Tables']['profiles']['Row'];
type Device = Database['public']['Tables']['devices']['Row'];
type FlagDefinition = Database['public']['Tables']['device_flag_definitions']['Row'];
type FlagValue = Database['public']['Tables']['device_flag_values']['Row'];

type Action = 'ISSUE' | 'RETURN';
type CustomFlagState = {
  value: boolean;
  note: string;
};

type DeviceReviewState = {
  is_damaged: boolean;
  damage_note: string;
  is_faulty: boolean;
  fault_note: string;
  customFlags: Record<string, CustomFlagState>;
};

export function HandoverWizard({
  action,
  couriers,
  devices,
  flagDefinitions = [],
  flagValues = []
}: {
  action: Action;
  couriers: Courier[];
  devices: Device[];
  flagDefinitions?: FlagDefinition[];
  flagValues?: FlagValue[];
}) {
  const isCheckout = action === 'ISSUE';
  const [step, setStep] = useState(1);
  const [courierId, setCourierId] = useState<string>('');
  const [courierQuery, setCourierQuery] = useState('');
  const [deviceQuery, setDeviceQuery] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceForms, setDeviceForms] = useState<Record<string, DeviceReviewState>>({});
  const [pin, setPin] = useState('');
  const [signature, setSignature] = useState('');
  const [dispatcherSignature, setDispatcherSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const signatureStep = 4;
  const stepLabels = ['Courier', 'Devices', 'Review devices', 'PIN & signatures'];

  const selectedCourier = couriers.find((c) => c.id === courierId) || null;
  const deviceMap = useMemo(() => {
    const map = new Map<string, Device>();
    devices.forEach((device) => map.set(device.id, device));
    return map;
  }, [devices]);

  const flagValuesByDevice = useMemo(() => {
    const map = new Map<string, Record<string, CustomFlagState>>();
    flagValues.forEach((entry) =>
      map.set(entry.device_id, {
        ...(map.get(entry.device_id) ?? {}),
        [entry.flag_id]: { value: Boolean(entry.value), note: entry.note ?? '' }
      })
    );
    return map;
  }, [flagValues]);

  const availableDevices = useMemo(() => {
    const pool =
      action === 'RETURN' && courierId
        ? devices.filter((device) => device.current_holder_id === courierId)
        : action === 'ISSUE'
        ? devices.filter((device) => device.status === 'AVAILABLE')
        : devices;
    if (!deviceQuery.trim()) return pool;
    const query = deviceQuery.toLowerCase();
    return pool.filter((device) => `${device.asset_tag} ${device.type}`.toLowerCase().includes(query));
  }, [devices, action, courierId, deviceQuery]);

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  useEffect(() => {
    setDeviceForms((prev) => {
      const next = { ...prev };
      selectedDevices.forEach((id) => {
        const device = deviceMap.get(id);
        if (!device) return;
        const perDevice = next[id];
        if (!perDevice) {
          const customFlags: Record<string, CustomFlagState> = {};
          flagDefinitions.forEach((def) => {
            const fromValues = flagValuesByDevice.get(id)?.[def.id];
            customFlags[def.id] = fromValues ?? { value: false, note: '' };
          });
          next[id] = {
            is_damaged: Boolean(device.is_damaged),
            damage_note: device.damage_note ?? '',
            is_faulty: Boolean(device.is_faulty),
            fault_note: device.fault_note ?? '',
            customFlags
          };
        } else {
          flagDefinitions.forEach((def) => {
            if (!perDevice.customFlags[def.id]) {
              const fromValues = flagValuesByDevice.get(id)?.[def.id];
              perDevice.customFlags[def.id] = fromValues ?? { value: false, note: '' };
            }
          });
        }
      });
      Object.keys(next).forEach((id) => {
        if (!selectedDevices.includes(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [selectedDevices, deviceMap, flagDefinitions, flagValuesByDevice]);

  const updateDeviceFlag = <K extends 'is_damaged' | 'damage_note' | 'is_faulty' | 'fault_note'>(
    deviceId: string,
    field: K,
    value: DeviceReviewState[K]
  ) => {
    setDeviceForms((prev) => ({
      ...prev,
      [deviceId]: {
        ...(prev[deviceId] ?? {
          is_damaged: false,
          damage_note: '',
          is_faulty: false,
          fault_note: '',
          customFlags: {}
        }),
        [field]: value
      }
    }));
  };

  const toggleCustomFlag = (deviceId: string, flagId: string) => {
    setDeviceForms((prev) => {
      const deviceState = prev[deviceId];
      if (!deviceState) return prev;
      const current = deviceState.customFlags[flagId] ?? { value: false, note: '' };
      const nextValue = !current.value;
      return {
        ...prev,
        [deviceId]: {
          ...deviceState,
          customFlags: {
            ...deviceState.customFlags,
            [flagId]: { value: nextValue, note: nextValue ? current.note : '' }
          }
        }
      };
    });
  };

  const updateCustomFlagNote = (deviceId: string, flagId: string, note: string) => {
    setDeviceForms((prev) => {
      const deviceState = prev[deviceId];
      if (!deviceState) return prev;
      return {
        ...prev,
        [deviceId]: {
          ...deviceState,
          customFlags: {
            ...deviceState.customFlags,
            [flagId]: { ...(deviceState.customFlags[flagId] ?? { value: false, note: '' }), note }
          }
        }
      };
    });
  };

  useEffect(
    () => () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
      }
    },
    []
  );

  const openModal = (successState: boolean, message: string) => {
    setModalSuccess(successState);
    setModalMessage(message);
    setShowModal(true);
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
    }
    modalTimerRef.current = setTimeout(() => setShowModal(false), 3000);
  };

  const validateDeviceForms = () => {
    for (const deviceId of selectedDevices) {
      const form = deviceForms[deviceId];
      if (!form) {
        setReviewError('Hiányoznak az eszköz adatai.');
        return false;
      }
      if (form.is_damaged && !form.damage_note.trim()) {
        const assetTag = deviceMap.get(deviceId)?.asset_tag ?? 'Ismeretlen eszköz';
        setReviewError(`${assetTag}: a sérülés leírása kötelező.`);
        return false;
      }
      if (form.is_faulty && !form.fault_note.trim()) {
        const assetTag = deviceMap.get(deviceId)?.asset_tag ?? 'Ismeretlen eszköz';
        setReviewError(`${assetTag}: a hiba leírása kötelező.`);
        return false;
      }
    }
    setReviewError(null);
    return true;
  };

  const submit = async () => {
    setError(null);
    setDocumentUrl(null);
    if (!selectedCourier) {
      setError('Select a courier first');
      return;
    }
    if (selectedDevices.length === 0) {
      setError('Select at least one device');
      return;
    }
    if (!validateDeviceForms()) {
      setError('Device details must be reviewed.');
      setStep(3);
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be 4-6 digits');
      return;
    }
    if (!signature || !dispatcherSignature) {
      setError('All required signatures must be captured');
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/handover/${action === 'ISSUE' ? 'issue' : 'return'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courierId,
        deviceIds: selectedDevices,
        pin,
        signature,
        dispatcherSignature,
        notes,
        deviceUpdates: selectedDevices.map((id) => ({
          id,
          is_damaged: deviceForms[id]?.is_damaged ?? false,
          damage_note: deviceForms[id]?.damage_note ?? '',
          is_faulty: deviceForms[id]?.is_faulty ?? false,
          fault_note: deviceForms[id]?.fault_note ?? '',
          customFlags: flagDefinitions.map((definition) => ({
            flagId: definition.id,
            value: Boolean(deviceForms[id]?.customFlags?.[definition.id]?.value),
            note: deviceForms[id]?.customFlags?.[definition.id]?.note?.trim() || null
          }))
        }))
      })
    });
    setLoading(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const messageText = payload.message || 'Failed to submit handover';
      setError(messageText);
      openModal(false, messageText);
      return;
    }
    const successMessage = 'Handover recorded';
    setDocumentUrl(payload.documentUrl || null);
    setPin('');
    setSignature('');
    setDispatcherSignature('');
    setNotes('');
    setSelectedDevices([]);
    setDeviceForms({});
    setCourierId('');
    setStep(1);
    openModal(true, successMessage);
    router.refresh();
  };

  let actionBar: {
    primaryLabel: string;
    primaryDisabled?: boolean;
    primaryOnClick: () => void;
    backLabel: string;
    backOnClick: () => void;
  } | null = null;

  if (step === 2) {
    actionBar = {
      primaryLabel: 'Continue',
      primaryDisabled: selectedDevices.length === 0,
      primaryOnClick: () => setStep(3),
      backLabel: 'Back',
      backOnClick: () => setStep(1)
    };
  } else if (step === 3) {
    actionBar = {
      primaryLabel: 'Continue',
      primaryOnClick: () => {
        if (validateDeviceForms()) setStep(signatureStep);
      },
      backLabel: 'Back',
      backOnClick: () => setStep(2)
    };
  } else if (step === signatureStep) {
    actionBar = {
      primaryLabel: loading ? 'Processing…' : action === 'ISSUE' ? 'Issue devices' : 'Confirm return',
      primaryDisabled: loading,
      primaryOnClick: submit,
      backLabel: 'Back',
      backOnClick: () => setStep(3)
    };
  }

  return (
    <div className="rounded bg-white p-4 pb-24 shadow">
      <ol className="mb-4 flex items-center text-sm">
        {stepLabels.map((label, idx) => (
          <li key={label} className={`flex-1 text-center ${step === idx + 1 ? 'font-semibold text-primary' : ''}`}>
            {label}
          </li>
        ))}
      </ol>
      {error && <p className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold">Select courier</h2>
          <input
            className="mt-2 w-full rounded border border-gray-300 p-2"
            placeholder="Search courier"
            value={courierQuery}
            onChange={(e) => setCourierQuery(e.target.value)}
          />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {couriers
              .filter((courier) =>
                `${courier.full_name} ${courier.email}`.toLowerCase().includes(courierQuery.toLowerCase())
              )
              .map((courier) => (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => {
                    setCourierId(courier.id);
                    setStep(2);
                  }}
                className={`rounded border px-4 py-3 text-left ${
                  courierId === courier.id ? 'border-primary bg-primary/10' : 'border-gray-200'
                }`}
              >
                <p className="font-semibold">{courier.full_name}</p>
                <p className="text-sm text-gray-500">{courier.email}</p>
              </button>
              ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold">Select devices</h2>
          <p className="text-sm text-gray-500">{availableDevices.length} devices available</p>
          <input
            className="mt-2 w-full rounded border border-gray-300 p-2"
            placeholder="Search device by asset tag"
            value={deviceQuery}
            onChange={(e) => setDeviceQuery(e.target.value)}
          />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {availableDevices.map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => toggleDevice(device.id)}
                className={`rounded border px-4 py-3 text-left ${
                  selectedDevices.includes(device.id) ? 'border-primary bg-primary/10' : 'border-gray-200'
                }`}
              >
                <p className="font-semibold">{device.asset_tag}</p>
                <p className="text-sm text-gray-500">{device.type}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold">Review devices</h2>
          <p className="text-sm text-gray-500">Frissítsd vagy erősítsd meg az eszközök aktuális állapotát.</p>
          {reviewError && <p className="mt-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{reviewError}</p>}
          <div className="mt-4 space-y-4">
            {selectedDevices.map((deviceId) => {
              const device = deviceMap.get(deviceId);
              const form = deviceForms[deviceId];
              if (!device || !form) return null;
              return (
                <div key={device.id} className="rounded border border-gray-200 p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-primary">{device.asset_tag}</p>
                    <p className="text-sm text-gray-500">{device.type}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase text-gray-500">Type</label>
                    <p className="mt-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {device.type}
                    </p>
                  </div>
                  {flagDefinitions.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-gray-500">Custom flags</p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {flagDefinitions.map((definition) => {
                          const entry = form.customFlags[definition.id] ?? { value: false, note: '' };
                          return (
                            <div key={definition.id} className="rounded border border-gray-200 p-3 text-xs space-y-2">
                              <label className="flex items-center gap-2 font-semibold text-sm">
                                <input
                                  type="checkbox"
                                  checked={entry.value}
                                  onChange={() => toggleCustomFlag(device.id, definition.id)}
                                />
                                {definition.name}
                              </label>
                              {entry.value && (
                                <textarea
                                  className="w-full rounded border border-gray-300 p-2"
                                  rows={2}
                                  placeholder="Add note (optional)"
                                  value={entry.note}
                                  onChange={(e) => updateCustomFlagNote(device.id, definition.id, e.target.value)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase text-gray-500">System flags</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {[
                        {
                          key: 'is_damaged' as const,
                          label: 'Damaged',
                          noteKey: 'damage_note' as const,
                          placeholder: 'Describe the damage'
                        },
                        {
                          key: 'is_faulty' as const,
                          label: 'Faulty',
                          noteKey: 'fault_note' as const,
                          placeholder: 'Describe the fault'
                        }
                      ].map((flag) => (
                        <div key={flag.key} className="rounded border border-gray-200 p-3 text-xs space-y-2">
                          <label className="flex items-center gap-2 font-semibold text-sm">
                            <input
                              type="checkbox"
                              checked={form[flag.key]}
                              onChange={(e) => {
                                updateDeviceFlag(device.id, flag.key, e.target.checked);
                                if (!e.target.checked) {
                                  updateDeviceFlag(device.id, flag.noteKey, '');
                                }
                              }}
                            />
                            {flag.label}
                          </label>
                          {form[flag.key] && (
                            <textarea
                              className="w-full rounded border border-gray-300 p-2"
                              rows={2}
                              placeholder={flag.placeholder}
                              value={form[flag.noteKey]}
                              onChange={(e) => updateDeviceFlag(device.id, flag.noteKey, e.target.value)}
                              required
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {device.type === 'PDA' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase text-gray-500">SIM card ID</label>
                        <p className="mt-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          {device.sim_card_id || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-500">Phone number</label>
                        <p className="mt-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          {device.phone_number || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs uppercase text-gray-500">Description</label>
                    <p className="mt-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {device.description || '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {step === signatureStep && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Courier PIN</h2>
            <PinPad value={pin} onChange={setPin} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Courier signature</h2>
            <SignaturePad onChange={setSignature} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dispatcher signature</h2>
            <SignaturePad onChange={setDispatcherSignature} />
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Notes</label>
            <textarea
              className="mt-1 w-full rounded border border-gray-300 p-2"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
      {actionBar && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
            <button className="rounded bg-gray-200 px-4 py-2" onClick={actionBar.backOnClick}>
              {actionBar.backLabel}
            </button>
            <button
              className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
              onClick={actionBar.primaryOnClick}
              disabled={actionBar.primaryDisabled}
            >
              {actionBar.primaryLabel}
            </button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white px-6 py-6 text-center shadow-2xl">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                modalSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {modalSuccess ? <CheckIcon className="h-8 w-8" /> : <XIcon className="h-8 w-8" />}
            </div>
            <p className="mt-4 text-lg font-semibold">
              {modalSuccess ? 'Successful save' : 'Failed save'}
            </p>
            <p className="mt-2 text-sm text-gray-600">{modalMessage}</p>
            {modalSuccess && documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Dokumentum letöltése (PDF)
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
