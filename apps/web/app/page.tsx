import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="grid gap-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10">
        <h2 className="text-2xl font-semibold text-white">
          Offline-Explorer für GHCN Daily Temperaturdaten
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Diese Offline-Demo nutzt NOAA/GHCN-Daten, die lokal in PostgreSQL/PostGIS
          voraggregiert wurden. So lassen sich Stationen schnell finden und Jahres- sowie
          Saisonmittelwerte unter 3 Sekunden darstellen.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-3 text-white transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
        >
          Explore
        </Link>
      </div>
      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Highlights</h3>
        <ul className="grid gap-2 text-slate-300">
          <li>• PostGIS Distanzsuche für Stations-Finder</li>
          <li>• Voraggregierte Jahres- und Saisonmittelwerte</li>
          <li>• LRU Cache + React Query für schnelle UX</li>
        </ul>
      </div>
    </section>
  );
}
