import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/auth-helpers';
import { verifyPin } from '@/lib/utils/pin';
import { saveSignatureImage } from '@/lib/signature';
import { generateHandoverPdf } from '@/lib/pdf/handover-document';
import { uploadToBucket } from '@/lib/storage';

const HANDOVER_DOCUMENT_BUCKET = process.env.NEXT_PUBLIC_HANDOVER_DOCS_BUCKET || 'handover-documents';

export async function POST(req: NextRequest) {
  const auth = await requireAdminAccess();
  if ('error' in auth) return auth.error;
  const { supabase, profile: dispatcher } = auth;
  const { courierId, deviceIds, pin, signature, dispatcherSignature, notes, deviceUpdates } = await req.json();
  if (!courierId || !Array.isArray(deviceIds) || deviceIds.length === 0) {
    return NextResponse.json({ message: 'Courier and devices are required' }, { status: 400 });
  }
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ message: 'PIN must be 4-6 digits' }, { status: 400 });
  }
  if (!signature || !dispatcherSignature) {
    return NextResponse.json({ message: 'Both signatures are required' }, { status: 400 });
  }

  const { data: courier } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', courierId)
    .eq('active', true)
    .single();
  if (!courier || courier.role !== 'COURIER') {
    return NextResponse.json({ message: 'Invalid courier' }, { status: 400 });
  }
  const validPin = await verifyPin(pin, courier.pin_hash);
  if (!validPin) {
    return NextResponse.json({ message: 'Invalid PIN' }, { status: 401 });
  }
  const { data: devices, error: deviceError } = await supabase
    .from('devices')
    .select('*')
    .in('id', deviceIds);
  if (deviceError) {
    return NextResponse.json({ message: deviceError.message }, { status: 400 });
  }
  if (!devices || devices.some((d) => d.status !== 'AVAILABLE')) {
    return NextResponse.json({ message: 'All devices must be available' }, { status: 400 });
  }

  type DeviceUpdate = {
    id: string;
    is_damaged?: boolean;
    damage_note?: string | null;
    is_faulty?: boolean;
    fault_note?: string | null;
    customFlags?: { flagId: string; value: boolean; note?: string | null }[];
  };

  const deviceUpdateMap = new Map<string, DeviceUpdate>();
  if (Array.isArray(deviceUpdates)) {
    for (const update of deviceUpdates as DeviceUpdate[]) {
      if (!update || typeof update !== 'object' || !update.id || !deviceIds.includes(update.id)) continue;
      deviceUpdateMap.set(update.id, update);
    }
  }

  const customFlagRows: { device_id: string; flag_id: string; value: boolean; note: string | null }[] = [];
  for (const update of deviceUpdateMap.values()) {
    if (update.is_damaged && (!update.damage_note || !update.damage_note.trim())) {
      return NextResponse.json({ message: 'Damage note is required for damaged devices' }, { status: 400 });
    }
    if (update.is_faulty && (!update.fault_note || !update.fault_note.trim())) {
      return NextResponse.json({ message: 'Fault note is required for faulty devices' }, { status: 400 });
    }
    const payload: Record<string, any> = {
      is_damaged: Boolean(update.is_damaged),
      damage_note: update.damage_note?.trim() || null,
      is_faulty: Boolean(update.is_faulty),
      fault_note: update.fault_note?.trim() || null
    };
    const { error: deviceUpdateError } = await supabase.from('devices').update(payload).eq('id', update.id);
    if (deviceUpdateError) {
      return NextResponse.json({ message: deviceUpdateError.message }, { status: 400 });
    }
    update.customFlags?.forEach((flag) => {
      if (!flag?.flagId) return;
      customFlagRows.push({
        device_id: update.id,
        flag_id: flag.flagId,
        value: Boolean(flag.value),
        note: flag.note?.trim() || null
      });
    });
  }

  if (customFlagRows.length > 0) {
    const { error: flagError } = await supabase
      .from('device_flag_values')
      .upsert(customFlagRows, { onConflict: 'device_id,flag_id' });
    if (flagError) {
      return NextResponse.json({ message: flagError.message }, { status: 400 });
    }
  }

  let courierSignatureUrl: string;
  let dispatcherSignatureUrl: string;
  try {
    courierSignatureUrl = await saveSignatureImage(signature, courierId);
    dispatcherSignatureUrl = await saveSignatureImage(dispatcherSignature, dispatcher.id);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Signature upload failed' }, { status: 500 });
  }

  const { data: batch, error: batchError } = await supabase
    .from('handover_batches')
    .insert({
      action_type: 'ISSUE',
      courier_id: courierId,
      dispatcher_id: dispatcher.id,
      signature_path: courierSignatureUrl,
      courier_signature_path: courierSignatureUrl,
      dispatcher_signature_path: dispatcherSignatureUrl,
      notes: notes || null
    })
    .select('*')
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ message: batchError?.message || 'Failed to create batch' }, { status: 400 });
  }

  const logs = devices.map((device) => ({
    device_id: device.id,
    from_profile_id: device.current_holder_id,
    to_profile_id: courierId,
    action_type: 'ISSUE',
    batch_id: batch.id
  }));
  const { error: logError } = await supabase.from('handover_logs').insert(logs);
  if (logError) {
    return NextResponse.json({ message: logError.message }, { status: 400 });
  }
  const { error: updateError } = await supabase
    .from('devices')
    .update({ status: 'ISSUED', current_holder_id: courierId })
    .in('id', deviceIds);
  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  const { data: customFlagRowsData } = await supabase
    .from('device_flag_values')
    .select('device_id, value, note, definition:device_flag_definitions(name)')
    .in('device_id', deviceIds);
  const flagValuesByDevice = new Map<
    string,
    { name: string; value: boolean; note: string | null }[]
  >();
  (customFlagRowsData ?? []).forEach((row) => {
    if (!row.device_id) return;
    const entries = flagValuesByDevice.get(row.device_id) ?? [];
    entries.push({
      name: row.definition?.name ?? 'Flag',
      value: Boolean(row.value),
      note: row.note ?? null
    });
    flagValuesByDevice.set(row.device_id, entries);
  });

  const formatSystemFlags = (update: DeviceUpdate | undefined, device: (typeof devices)[number]) => {
    const formatEntry = (label: string, value: boolean, note?: string | null) => {
      const status = value ? 'Igen' : 'Nem';
      const noteSuffix = note ? ` (${note})` : '';
      return `${label}: ${status}${noteSuffix}`;
    };
    const damaged = Boolean(update?.is_damaged ?? device.is_damaged);
    const damageNote = update?.damage_note ?? device.damage_note ?? '';
    const faulty = Boolean(update?.is_faulty ?? device.is_faulty);
    const faultNote = update?.fault_note ?? device.fault_note ?? '';
    return [formatEntry('Sérült', damaged, damageNote), formatEntry('Hibás', faulty, faultNote)].join(', ');
  };

  const formatCustomFlags = (deviceId: string) => {
    const entries = flagValuesByDevice.get(deviceId) ?? [];
    if (!entries.length) return 'Nincs megadva';
    return entries
      .map((entry) => {
        const noteSuffix = entry.note ? ` (${entry.note})` : '';
        return `${entry.name}: ${entry.value ? 'Igen' : 'Nem'}${noteSuffix}`;
      })
      .join(', ');
  };

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  const location = process.env.HANDOVER_PDF_LOCATION || '—';

  try {
    const pdfBytes = await generateHandoverPdf({
      receiverName: courier.full_name ?? courier.email ?? 'Ismeretlen futár',
      date: formattedDate,
      location,
      giverName: dispatcher.full_name ?? dispatcher.email ?? 'Ismeretlen diszpécser',
      giverSignature: dispatcherSignature,
      receiverSignature: signature,
      giverLabel: 'Átadó',
      receiverLabel: 'Átvevő',
      notes: notes ?? '',
      generalItems: devices.map((device) => ({
        name: device.asset_tag,
        quantity: '1 db'
      })),
      pdaItems: devices
        .filter((device) => device.type === 'PDA')
        .map((device) => {
          const update = deviceUpdateMap.get(device.id);
          return {
            name: device.asset_tag,
            quantity: '1 db',
            type: device.type,
            customFlags: formatCustomFlags(device.id),
            systemFlags: formatSystemFlags(update, device),
            simCardId: device.sim_card_id || '—',
            phoneNumber: device.phone_number || '—',
            description: device.description || '—'
          };
        }),
      mobilePrinters: devices
        .filter((device) => device.type === 'MOBILE_PRINTER')
        .map((device) => {
          const update = deviceUpdateMap.get(device.id);
          return {
            name: device.asset_tag,
            quantity: '1 db',
            type: device.type,
            customFlags: formatCustomFlags(device.id),
            systemFlags: formatSystemFlags(update, device),
            description: device.description || '—'
          };
        }),
      courierSignature: signature,
      dispatcherSignature
    });
    const pdfPath = `${courierId}/${batch.id}.pdf`;
    const pdfUrl = await uploadToBucket({
      bucket: HANDOVER_DOCUMENT_BUCKET,
      path: pdfPath,
      data: pdfBytes,
      contentType: 'application/pdf'
    });
    const { error: documentUpdateError } = await supabase
      .from('handover_batches')
      .update({ document_path: pdfUrl })
      .eq('id', batch.id);
    if (documentUpdateError) {
      console.error('[handover/issue] failed to store document url', documentUpdateError.message);
      return NextResponse.json({ message: 'Failed to store document reference' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, documentUrl: pdfUrl });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to generate document' }, { status: 500 });
  }
}
