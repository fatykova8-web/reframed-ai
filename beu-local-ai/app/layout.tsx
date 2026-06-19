import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeU Local AI Prototype',
  description: 'Style the pieces you love but never reach for.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
