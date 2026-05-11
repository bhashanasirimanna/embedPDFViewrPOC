import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Vault',
  description: 'Upload, store, and view PDF documents',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden" suppressHydrationWarning>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
