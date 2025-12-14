import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'TradeQuest - Trading Journal',
  description: 'Professional trading journal and performance analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
