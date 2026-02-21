'use client';

export const ErrorBanner = ({ message }: { message: string }) => {
  return (
    <div
      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-100"
      role="alert"
    >
      {message}
    </div>
  );
};