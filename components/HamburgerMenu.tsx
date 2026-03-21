'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',      label: 'ホーム',      icon: '🏠' },
  { href: '/cards', label: 'カード明細', icon: '💳' },
  { href: '/info',  label: 'その他',      icon: '⚙️' },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex flex-col justify-center items-center gap-1.5 rounded-xl bg-white/20 active:scale-95 transition-transform"
        aria-label="メニューを開く"
      >
        <span className="w-5 h-0.5 bg-white rounded-full" />
        <span className="w-5 h-0.5 bg-white rounded-full" />
        <span className="w-5 h-0.5 bg-white rounded-full" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-64 z-50 bg-white shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-slate-900 px-5 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm">松本家の家計簿</p>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === item.href
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
