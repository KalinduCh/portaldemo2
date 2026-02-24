import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'LEO Portal | Athugalpura',
  description: 'Leo Club Member Portal for Leo Club of Athugalpura',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LeoPortal',
  },
  icons: {
    icon: 'https://i.imgur.com/MP1YFNf.png',
    apple: 'https://i.imgur.com/MP1YFNf.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LEO Portal',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <meta name="application-name" content="LEO Portal" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LEO Portal" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
                {children}
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
      </body>
    </html>
  );
}