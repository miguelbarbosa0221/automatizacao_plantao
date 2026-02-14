
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";
import { AuthInitializer } from "@/components/auth-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlantãoAI",
  description: "Gestão inteligente de escalas e chamados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}
