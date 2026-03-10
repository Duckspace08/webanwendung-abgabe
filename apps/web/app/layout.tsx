import 'leaflet/dist/leaflet.css';
import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'GHCN Climate Explorer',
  description: 'Offline Klima-Demo für GHCN Daily Daten',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
            <header className="mb-10">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                GHCN Climate Explorer
              </p>
              <h1 className="text-3xl font-semibold text-white">Temperaturdaten interaktiv</h1>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-400">
              Offline-Demo mit aggregierten NOAA/GHCN Daily Daten.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
