
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

    const isLoginPage = pathname === '/' || pathname === '/login';

    if (!user && !isLoginPage) {
      router.push('/');
      return;
    }

    if (user && isLoginPage) {
      router.push('/demands/history');
      return;
    }

    // Garantir que o usuário tenha um perfil pessoal
    if (user && db && !isInitializingProfile && !profile) {
      setIsInitializingProfile(true);
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      
      setDoc(profileRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        createdAt: new Date().toISOString()
      }, { merge: true })
        .then(() => setIsInitializingProfile(false))
        .catch(err => {
          console.error("Erro ao inicializar perfil:", err);
          setIsInitializingProfile(false);
        });
    }
  }, [user, isUserLoading, db, profile, pathname, router, isMounted, isInitializingProfile]);

  if (!isMounted) return null;

  if (user && (isUserLoading || isInitializingProfile || !profile)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Carregando Perfil...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
