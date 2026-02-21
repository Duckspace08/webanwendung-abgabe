import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../components/Providers';
import { Header } from '../components/Header';

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
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-400">
              Offline-Demo mit synthetischen NOAA/GHCN Daily Daten.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}