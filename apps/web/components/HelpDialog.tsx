'use client';

import { useEffect, useRef } from 'react';
import { MAX_LIMIT, MAX_RADIUS } from '@webanwendung/shared';

export const HelpDialog = () => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const open = () => {
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
  };

  const close = () => {
    dialogRef.current?.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => {
      lastActiveRef.current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    dialog.addEventListener('close', onClose);
    dialog.addEventListener('keydown', onKeyDown);

    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
        aria-haspopup="dialog"
      >
        Hilfe
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(720px,calc(100vw-2rem))] rounded-3xl border border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70"
        aria-label="How-to: Bedienung der Anwendung"
      >
        <div className="p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">How-to</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Stationssuche & Auswertung</h2>
              <p className="mt-3 text-slate-300">
                Kurzanleitung zur Bedienung der Anwendung – inkl. Parametererklärung und Grenzwerten.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3 py-2 text-slate-200 opacity-80 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              aria-label="Dialog schließen"
            >
              ✕
            </button>
          </div>

          <div className="mt-8 grid gap-6">
            <section className="grid gap-2">
              <h3 className="text-lg font-semibold text-white">1) Suche starten</h3>
              <ol className="ml-5 list-decimal text-slate-300">
                <li>Öffnen Sie „Explore“.</li>
                <li>Geben Sie Standort (Latitude/Longitude) und Suchparameter ein.</li>
                <li>Klicken Sie „Stationen suchen“.</li>
              </ol>
            </section>

            <section className="grid gap-2">
              <h3 className="text-lg font-semibold text-white">2) Parameter (Bedeutung)</h3>
              <ul className="ml-5 list-disc text-slate-300">
                <li><strong>Latitude/Longitude</strong>: Standpunkt für die Umkreissuche.</li>
                <li><strong>Radius (km)</strong>: Umkreis um den Standpunkt.</li>
                <li><strong>Limit</strong>: maximale Anzahl gefundener Stationen.</li>
                <li><strong>Min/Max Year</strong>: Station muss Daten für diesen Zeitraum abdecken.</li>
              </ul>
              <p className="text-sm text-slate-400">
                Grenzwerte: <strong>Radius max. 2000 km</strong>, <strong>Limit max. 50</strong>.
              </p>
            </section>

            <section className="grid gap-2">
              <h3 className="text-lg font-semibold text-white">3) Von Suche zur Auswertung</h3>
              <ol className="ml-5 list-decimal text-slate-300">
                <li>Wählen Sie eine Station in der Ergebnisliste (optional für Kartenfokus).</li>
                <li>Klicken Sie „Zur Auswertung“.</li>
                <li>Passen Sie bei Bedarf den Zeitraum an und klicken Sie „Auswertung laden“.</li>
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              <p>
                Tipp: Die Anwendung ist vollständig per Tastatur bedienbar. Nutzen Sie <kbd className="rounded bg-slate-800 px-1">Tab</kbd>{' '}
                zum Navigieren und <kbd className="rounded bg-slate-800 px-1">Enter</kbd> zum Auslösen.
              </p>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950 px-8 py-4">
          <button
            type="button"
            onClick={close}
            className="rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            Verstanden
          </button>
        </div>
      </dialog>
    </>
  );
};