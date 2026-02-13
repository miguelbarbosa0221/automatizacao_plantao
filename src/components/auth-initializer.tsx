
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, profile } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isInitializingProfile, setIsInitializingProfile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Redirecionamento de login
    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }

    if (!isUserLoading && user && pathname === '/login') {
      router.push('/');
    }

    // Lógica de reparo/criação de perfil para Multi-Tenant
    if (user && db && !isUserLoading && !isInitializingProfile) {
      // Se não temos perfil ou ele está incompleto
      const needsRepair = !profile || 
                         !profile.companies || 
                         !Array.isArray(profile.companies) || 
                         profile.companies.length === 0 ||
                         !profile.activeCompanyId;

      if (needsRepair) {
        setIsInitializingProfile(true);
        const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
        
        const stableCompanyId = `org-${user.uid.substring(0, 10)}`;
        const companyRef = doc(db, 'companies', stableCompanyId);
        const batch = writeBatch(db);
        
        batch.set(companyRef, {
          id: stableCompanyId,
          name: 'Minha Organização',
          active: true,
          createdAt: new Date().toISOString()
        }, { merge: true });

        batch.set(profileRef, {
          uid: user.uid,
          email: user.email || 'usuario@plantaoai.local',
          displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
          activeCompanyId: stableCompanyId,
          companies: [
            { id: stableCompanyId, name: 'Minha Organização', role: 'admin' }
          ],
          updatedAt: new Date().toISOString()
        }, { merge: true });

        batch.commit()
          .then(() => {
            setIsInitializingProfile(false);
          })
          .catch(err => {
            console.error("Erro ao inicializar perfil:", err);
            setIsInitializingProfile(false);
          });
      }
    }
  }, [user, isUserLoading, db, profile, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) {
    return null;
  }

  // Se o usuário está logado mas o perfil está sendo reparado ou ainda carregando
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
