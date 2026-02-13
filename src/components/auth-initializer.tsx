
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
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
      const needsRepair = !profile || 
                         !profile.companies || 
                         profile.companies.length === 0 ||
                         !profile.activeCompanyId ||
                         !isAdmin; // Se logado mas não for admin, algo está errado no perfil

      if (needsRepair) {
        setIsInitializingProfile(true);
        const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
        
        // Usamos um ID estável para evitar criação de múltiplas empresas órfãs
        const stableCompanyId = `org-${user.uid.substring(0, 10)}`;
        const companyRef = doc(db, 'companies', stableCompanyId);
        const batch = writeBatch(db);
        
        // Garante que a empresa exista
        batch.set(companyRef, {
          id: stableCompanyId,
          name: 'Minha Organização',
          active: true,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Garante que o perfil aponte para esta empresa como ADMIN
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
            console.log("Perfil normalizado com sucesso.");
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

  // Se o usuário está logado mas o perfil está incompleto, mostramos o loader de reparo
  // Isso evita que o app tente ler coleções de empresas sem as permissões corretas
  if (user && (isUserLoading || isInitializingProfile || !profile || !isAdmin)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Normalizando permissões de administrador...
          </p>
        </div>
      </div>
    );
  }

  // Se não tem usuário e não está na página de login, mostramos um loader rápido
  if (!user && pathname !== '/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return <>{children}</>;
}
