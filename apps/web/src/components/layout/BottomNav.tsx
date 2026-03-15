'use client';

import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { path: '/home', label: '홈', mark: 'H' },
  { path: '/pets/manage', label: '펫', mark: 'P' },
  { path: '/messenger', label: '메시지', mark: 'M' },
  { path: '/settings', label: '설정', mark: 'C' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3"
      style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 10px)' }}
    >
      <nav
        className="mx-auto grid max-w-[454px] grid-cols-4 rounded-[28px] border p-2"
        style={{
          background: 'rgba(255, 250, 245, 0.82)',
          borderColor: 'rgba(77, 55, 43, 0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 rounded-[20px] px-2 py-2 transition-transform active:scale-[0.97]"
              style={{
                background: isActive ? 'rgba(159, 120, 92, 0.12)' : 'transparent',
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: isActive ? 'var(--gradient-warm)' : 'rgba(255,255,255,0.5)',
                  color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                {item.mark}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
