import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'World Cup 2026 Predictor',
  description: 'Predict FIFA World Cup 2026 match results and compete with your friends!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117]">
        <Providers>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
          <Toaster position="top-right" toastOptions={{ style: { background: '#161b22', color: '#e6edf3', border: '1px solid #30363d' } }} />
        </Providers>
      </body>
    </html>
  );
}
