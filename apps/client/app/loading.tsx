export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-ink-300">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-accent-red" />
        <p className="font-display tracking-widest text-sm">LOADING…</p>
      </div>
    </main>
  );
}
