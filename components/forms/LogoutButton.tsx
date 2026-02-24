'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded border border-white/40 px-3 py-1 text-sm text-white transition hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
