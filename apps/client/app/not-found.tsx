import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl tracking-widest text-accent-red">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-ink-100">ページが見つかりません</h1>
        <p className="mt-2 text-ink-400">ルームコードが正しいかご確認ください。</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md border border-ink-700 bg-ink-800 px-5 py-2 text-sm uppercase tracking-widest text-ink-100 transition hover:border-accent-red hover:text-accent-red"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}
