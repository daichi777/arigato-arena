import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ArigatoArena',
  description: '社内イベント向けブラウザFPS — 5v5 チームデスマッチ',
  applicationName: 'ArigatoArena',
};

export const viewport: Viewport = {
  themeColor: '#0a0b0e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
