import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Stringcost Starter',
  description: 'Scaffolded by create-stringcost-app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
