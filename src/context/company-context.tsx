"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@/firebase";

export interface Company {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface CompanyContextType {
  currentCompany: Company | null;
  setCompany: (company: Company | null) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({} as CompanyContextType);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Começa sempre no modo "Pessoal" (sem empresa) por segurança
    setIsLoading(false);
  }, [user]);

  return (
    <CompanyContext.Provider value={{ currentCompany, setCompany: setCurrentCompany, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);