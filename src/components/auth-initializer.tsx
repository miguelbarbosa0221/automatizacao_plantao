
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isInitializingProfile, setIsInitializingProfile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }

    if (!isUserLoading && user && pathname === '/login') {
      router.push('/');
    }

    // Lógica de reparo/criação de perfil para Multi-Tenant
    if (user && db && !isUserLoading && !isInitializingProfile) {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      
      getDoc(profileRef).then((snap) => {
        const data = snap.data();
        
        // Verifica se o perfil precisa de inicialização ou reparo
        const needsRepair = !snap.exists() || 
                           !data?.companies || 
                           !Array.isArray(data.companies) || 
                           data.companies.length === 0 ||
                           !data.companies.find((c: any) => c.role === 'admin');

        if (needsRepair) {
          setIsInitializingProfile(true);
          const batch = writeBatch(db);
          
          // Usa ID determinístico para a empresa inicial para evitar duplicação por refresh
          const companyId = data?.activeCompanyId || `org-${user.uid.slice(0, 8)}`;
          const companyRef = doc(db, 'companies', companyId);
          
          batch.set(companyRef, {
            id: companyId,
            name: 'Minha Organização',
            active: true,
            createdAt: data?.createdAt || new Date().toISOString()
          }, { merge: true });

          batch.set(profileRef, {
            uid: user.uid,
            email: user.email || 'usuario@plantaoai.local',
            displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
            activeCompanyId: companyId,
            companies: [
              { id: companyId, name: 'Minha Organização', role: 'admin' }
            ],
            updatedAt: new Date().toISOString()
          }, { merge: true });

          batch.commit()
            .then(() => setIsInitializingProfile(false))
            .catch(err => {
              console.error("Erro ao inicializar perfil:", err);
              setIsInitializingProfile(false);
            });
        }
      });
    }
  }, [user, isUserLoading, db, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) {
    return null;
  }

  if (isUserLoading || isInitializingProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isInitializingProfile ? "Configurando seu ambiente..." : "Validando sessão segura..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
