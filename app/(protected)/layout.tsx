import { ReactNode } from 'react';
import { getSessionProfile } from '@/lib/auth';
import { ProtectedNav } from '@/components/layout/ProtectedNav';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const navItems: { href: string; label: string; roles?: Profile['role'][] }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Users', roles: ['ADMIN'] },
  { href: '/devices', label: 'Devices' },
  { href: '/handover/checkout', label: 'Check out' },
  { href: '/handover/checkin', label: 'Check in' },
  { href: '/settings', label: 'Settings', roles: ['ADMIN'] }
];

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSessionProfile(['ADMIN']);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 bg-primary text-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">FoxOps</p>
              <p className="text-xs text-white/80">{profile.full_name}</p>
            </div>
            <ProtectedNav profile={profile} items={navItems} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
