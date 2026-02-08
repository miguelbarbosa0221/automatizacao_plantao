
'use client';

import { useEffect } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, profile } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Se não estiver logado e não estiver na página de login, redireciona
    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }

    // Se estiver logado mas na página de login, redireciona para home
    if (!isUserLoading && user && pathname === '/login') {
      router.push('/');
    }

    // Lógica de criação de perfil para o primeiro login
    if (user && db && !profile && !isUserLoading) {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      getDoc(profileRef).then((snap) => {
        if (!snap.exists()) {
          // O primeiro usuário a logar no sistema em modo protótipo ganha admin
          setDoc(profileRef, {
            uid: user.uid,
            role: 'admin',
            email: user.email || 'usuario@plantaoai.local',
            displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
            createdAt: new Date().toISOString()
          });
        }
      });
    }
  }, [user, isUserLoading, auth, db, profile, pathname, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Iniciando ambiente seguro...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
