export type Totals = {
  totalDevices: number;
  available: number;
  issued: number;
  brokenLost: number;
  inService: number;
};

export type DeviceTypeCount = {
  type: 'PDA' | 'MOBILE_PRINTER' | string;
  count: number;
};

export type HandoverDaily = {
  date: string;
  issuedCount: number;
};

export type RecentHandover = {
  deviceId: string;
  timestamp: string;
  action: 'ISSUE' | 'RETURN' | string;
};

const today = new Date();
const makeDate = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

export const mockTotals: Totals = {
  totalDevices: 412,
  available: 182,
  issued: 167,
  brokenLost: 23,
  inService: 40
};

export const mockDeviceTypes: DeviceTypeCount[] = [
  { type: 'PDA', count: 280 },
  { type: 'MOBILE_PRINTER', count: 96 },
  { type: 'LOCKER_SCANNER', count: 36 }
];

export const mockHandoversDaily: HandoverDaily[] = Array.from({ length: 21 }).map((_, index) => ({
  date: makeDate(20 - index),
  issuedCount: Math.max(2, Math.round(18 + Math.sin(index / 3) * 6 + (index % 5)))
}));

export const mockRecentHandovers: RecentHandover[] = [
  { deviceId: 'PDA-082', timestamp: new Date().toISOString(), action: 'ISSUE' },
  { deviceId: 'PRN-014', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), action: 'RETURN' },
  { deviceId: 'PDA-221', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), action: 'ISSUE' }
];
