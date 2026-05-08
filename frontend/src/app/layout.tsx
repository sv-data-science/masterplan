import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BrickVault – LEGO Collection Companion',
  description: 'Track your LEGO collection, discover sets, earn achievements, and connect with fellow collectors. Unofficial LEGO fan app.',
  keywords: ['LEGO', 'collection tracker', 'minifigures', 'sets', 'bricks', 'collector'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-lego-darker">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
