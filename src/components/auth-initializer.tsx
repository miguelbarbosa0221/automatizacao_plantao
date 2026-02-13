
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

    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.push('/');
      return;
    }

    // Lógica de Reparo de Perfil: Garante que o usuário tenha uma empresa e seja Admin
    if (user && db && !isInitializingProfile) {
      const needsRepair = !profile || !profile.activeCompanyId || !isAdmin;

      if (needsRepair) {
        setIsInitializingProfile(true);
        const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
        
        // ID estável para evitar criação de múltiplas empresas órfãs
        const stableCompanyId = `org-${user.uid.substring(0, 10)}`;
        const companyRef = doc(db, 'companies', stableCompanyId);
        const batch = writeBatch(db);
        
        // 1. Garante a existência da empresa (allow create se assinado)
        batch.set(companyRef, {
          id: stableCompanyId,
          name: 'Minha Organização Principal',
          active: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Garante que o perfil aponte para esta empresa como ADMIN
        batch.set(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          activeCompanyId: stableCompanyId,
          companies: [
            { id: stableCompanyId, name: 'Minha Organização Principal', role: 'admin' }
          ],
          updatedAt: new Date().toISOString()
        }, { merge: true });

        batch.commit()
          .then(() => {
            setIsInitializingProfile(false);
          })
          .catch(err => {
            console.error("Erro crítico na inicialização do perfil:", err);
            setIsInitializingProfile(false);
          });
      }
    }
  }, [user, isUserLoading, db, profile, isAdmin, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) return null;

  // Bloqueia o acesso até que o perfil de administrador esteja 100% pronto
  if (user && (isUserLoading || isInitializingProfile || !profile || !isAdmin)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Sincronizando acesso organizacional...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
