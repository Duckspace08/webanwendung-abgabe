'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpDialog } from './HelpDialog';

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
        active ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
};

export const Header = () => {
  return (
    <header className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">GHCN Climate Explorer</p>
          <h1 className="text-3xl font-semibold text-white">Temperaturdaten interaktiv</h1>
        </div>

        <nav className="flex items-center gap-2" aria-label="Hauptnavigation">
          <NavLink href="/" label="Home" />
          <NavLink href="/explore" label="Explore" />
          <HelpDialog />
        </nav>
      </div>
    </header>
  );
};