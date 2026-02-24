'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Database } from '@/types/database';
import { LogoutButton } from '@/components/forms/LogoutButton';

type Profile = Database['public']['Tables']['profiles']['Row'];

type NavItem = {
  href: string;
  label: string;
  roles?: Profile['role'][];
};

interface Props {
  profile: Profile;
  items: NavItem[];
}

export function ProtectedNav({ profile, items }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(profile.role));

  const linkClass = (active: boolean) =>
    `rounded px-3 py-1 transition ${
      active ? 'bg-white/25 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'
    }`;

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <div className="w-full md:w-auto">
      <div className="flex items-center justify-end md:hidden">
        <button
          type="button"
          onClick={handleToggle}
          className="rounded border border-white/40 p-2 text-white"
          aria-label="Menü megnyitása"
          aria-expanded={open}
        >
          <span className="block h-0.5 w-6 bg-white"></span>
          <span className="mt-1 block h-0.5 w-6 bg-white"></span>
          <span className="mt-1 block h-0.5 w-6 bg-white"></span>
        </button>
      </div>
      <nav
        className={`${
          open ? 'flex' : 'hidden'
        } mt-3 flex-col gap-2 text-sm text-white md:mt-0 md:flex md:flex-row md:items-center md:gap-3`}
      >
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={linkClass(active)} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          );
        })}
        <div className="md:ml-2" onClick={() => setOpen(false)}>
          <LogoutButton />
        </div>
      </nav>
    </div>
  );
}
