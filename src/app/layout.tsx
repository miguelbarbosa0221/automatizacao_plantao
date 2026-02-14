import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AuthInitializer } from "@/components/auth-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlantãoAI - Gestão de Demandas",
  description: "Sistema inteligente de gestão de plantões e demandas de TI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <FirebaseClientProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </FirebaseClientProvider>

        <Toaster />
      </body>
    </html>
  );
}