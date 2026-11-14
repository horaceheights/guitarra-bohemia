import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Teoría, Oído y Requinto`,
  description: APP_CONFIG.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#110e0c] text-[#f5efe6] flex flex-col selection:bg-amber-500/30 selection:text-amber-100">
        {children}
      </body>
    </html>
  );
}
