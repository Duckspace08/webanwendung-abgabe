'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-rose-100">
          <h2 className="text-lg font-semibold">Unerwarteter Fehler</h2>
          <p className="mt-2 text-sm opacity-90">
            Beim Rendern der Oberfläche ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-rose-600 px-4 py-2 text-white transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}