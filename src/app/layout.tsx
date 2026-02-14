import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";
import { AuthInitializer } from "@/components/auth-initializer";
import { initializeFirebase } from "@/firebase";

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
  const { firebaseApp, auth, firestore } = initializeFirebase();
  
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <FirebaseProvider
          firebaseApp={firebaseApp}
          auth={auth}
          firestore={firestore}
        >
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}