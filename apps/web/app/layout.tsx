import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TourGuard Dashboard',
  description: 'Tour separation reporting and coordination dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
  <body>{children}</body>
    </html>
  );
}
