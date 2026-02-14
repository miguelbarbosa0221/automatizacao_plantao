import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";
import { CompanyProvider } from "@/context/company-context"; // <--- Importante
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

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
    <html lang="pt-BR">
      <body className={inter.className}>
        <FirebaseProvider>
          <CompanyProvider> {/* <--- A mágica acontece aqui */}
            <FirebaseErrorListener />
            {children}
          </CompanyProvider>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}