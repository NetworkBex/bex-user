import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import { themeInitScript } from '@/components/ui/ThemeToggle';

export const metadata: Metadata = {
  title: 'BEX Network — Verified Web3 Execution',
  description: 'Verification-first Web3 execution infrastructure with AI-driven trading operations and on-chain receipts.',
  metadataBase: new URL('https://bexnetwork.io'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Avoid theme flash by setting the class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body className="antialiased font-sans bg-canvas text-fg" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
