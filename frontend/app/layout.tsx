/**
 * Root layout for DocSense application.
 * Sets up providers, fonts, and global context.
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DocSense | Ask questions. Get cited answers.',
  description: 'DocSense is a research-first application that answers questions directly from your documents with page-level citations.',
  keywords: ['AI', 'research', 'documents', 'PDF', 'citations', 'RAG', 'questions', 'answers'],
  authors: [{ name: 'DocSense' }],
  openGraph: {
    title: 'DocSense - Ask questions. Get cited answers.',
    description: 'A research-first application that answers questions directly from your documents with page-level citations.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
