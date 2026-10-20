import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { InstallPrompt } from './install-prompt';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'Primate Fuel - Food & Nutrition Tracker',
  description: 'Fast mobile food intake tracker and visual nutrition planner',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Primate Fuel',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} bg-[#090d16] text-slate-100 min-h-dvh antialiased flex justify-center`}>
        <main className="w-full max-w-md md:max-w-none h-dvh flex flex-col shadow-2xl bg-[#0b101b] border-x border-slate-900/60 relative">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
