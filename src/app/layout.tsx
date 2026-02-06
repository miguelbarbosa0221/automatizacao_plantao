
import type {Metadata} from 'next';
import './globals.css';
import {SidebarProvider} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase/client-provider';
import {AuthInitializer} from '@/components/auth-initializer';

export const metadata: Metadata = {
  title: 'PlantãoAI - Gestão de Demandas de TI',
  description: 'Sistema centralizado para gestão de demandas de TI durante plantão.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <FirebaseClientProvider>
          <AuthInitializer>
            <SidebarProvider>
              {children}
              <Toaster />
            </SidebarProvider>
          </AuthInitializer>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
