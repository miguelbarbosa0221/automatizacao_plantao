
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, profile, isAdmin } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isInitializingProfile, setIsInitializingProfile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isUserLoading) return;

    // Redirecionamento de login
    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.push('/');
      return;
    }

    // Lógica de reparo/criação de perfil para Multi-Tenant
    if (user && db && !isInitializingProfile) {
      const hasValidProfile = profile && 
                            profile.companies && 
                            profile.companies.length > 0 &&
                            profile.activeCompanyId &&
                            isAdmin;

      if (!hasValidProfile) {
        setIsInitializingProfile(true);
        const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
        
        // ID estável baseado no UID para evitar orfandade de dados
        const stableCompanyId = `org-${user.uid.substring(0, 10)}`;
        const companyRef = doc(db, 'companies', stableCompanyId);
        const batch = writeBatch(db);
        
        // Garante que a empresa exista
        batch.set(companyRef, {
          id: stableCompanyId,
          name: 'Minha Organização Principal',
          active: true,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Garante que o perfil aponte para esta empresa como ADMIN (Papel miguel220095@gmail.com)
        batch.set(profileRef, {
          uid: user.uid,
          email: user.email || 'usuario@plantaoai.local',
          displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
          activeCompanyId: stableCompanyId,
          companies: [
            { id: stableCompanyId, name: 'Minha Organização Principal', role: 'admin' }
          ],
          updatedAt: new Date().toISOString()
        }, { merge: true });

        batch.commit()
          .then(() => {
            console.log("Perfil normalizado com sucesso para Admin.");
            setIsInitializingProfile(false);
          })
          .catch(err => {
            console.error("Erro crítico ao inicializar perfil:", err);
            setIsInitializingProfile(false);
          });
      }
    }
  }, [user, isUserLoading, db, profile, isAdmin, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) return null;

  // Mostra loader se o usuário está logado mas o perfil está sendo normalizado
  if (user && (isUserLoading || isInitializingProfile || !profile || !isAdmin)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Garantindo acesso de administrador...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
