'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
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
    if (!isMounted || isUserLoading) return;

    // CORREÇÃO: Verifica se está em página de login (/ ou /login)
    const isLoginPage = pathname === '/' || pathname === '/login';

    // Se não estiver logado e não estiver na página de login, redireciona para /
    if (!user && !isLoginPage) {
      router.push('/');
      return;
    }

    // CORREÇÃO: Se estiver logado e estiver na página de login, redireciona para /demands/history
    if (user && isLoginPage) {
      router.push('/demands/history');
      return;
    }

    // Garantir que o usuário tenha um perfil e empresa
    if (user && db && !isInitializingProfile && !profile) {
      setIsInitializingProfile(true);
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      const stableCompanyId = `org-${user.uid.substring(0, 10)}`;
      const companyRef = doc(db, 'companies', stableCompanyId);
      
      // Criar perfil e empresa
      Promise.all([
        setDoc(companyRef, {
          id: stableCompanyId,
          name: 'Minha Organização',
          active: true,
          createdAt: new Date().toISOString()
        }, { merge: true }),
        setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          activeCompanyId: stableCompanyId,
          companies: [
            { id: stableCompanyId, name: 'Minha Organização', role: 'admin' }
          ],
          createdAt: new Date().toISOString()
        }, { merge: true })
      ])
        .then(() => setIsInitializingProfile(false))
        .catch(err => {
          console.error("Erro ao inicializar perfil:", err);
          setIsInitializingProfile(false);
        });
    }
  }, [user, isUserLoading, db, profile, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) return null;

  // Mostrar loading apenas se estiver logado e ainda carregando dados
  if (user && (isUserLoading || isInitializingProfile || !profile)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}