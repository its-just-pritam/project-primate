import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { InstallPrompt } from './install-prompt';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'Platito - Food & Nutrition Tracker',
  description: 'Fast mobile food intake tracker and visual nutrition planner',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Platito',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0b1220',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} bg-[#141c2b] text-slate-100 min-h-dvh antialiased flex justify-center`}>
        <main className="w-full max-w-md md:max-w-none h-dvh flex flex-col shadow-2xl bg-[#141c2b] border-x border-slate-900/60 relative">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
