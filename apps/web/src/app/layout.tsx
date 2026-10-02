import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/auth-context';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Planejador BNCC — Controle Docente',
  description:
    'Planejamento pedagógico com autonomia docente e integração oficial à BNCC.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
