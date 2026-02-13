
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, profile } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

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

    if (user && db && !profile && !isUserLoading) {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      getDoc(profileRef).then((snap) => {
        if (!snap.exists()) {
          const batch = writeBatch(db);
          
          // Criação da empresa padrão para o novo usuário
          const companyId = Math.random().toString(36).substr(2, 9);
          const companyRef = doc(db, 'companies', companyId);
          
          batch.set(companyRef, {
            id: companyId,
            name: 'Minha Empresa',
            active: true,
            createdAt: new Date().toISOString()
          });

          batch.set(profileRef, {
            uid: user.uid,
            email: user.email || 'usuario@plantaoai.local',
            displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
            activeCompanyId: companyId,
            companies: [
              { id: companyId, name: 'Minha Empresa', role: 'admin' }
            ],
            createdAt: new Date().toISOString()
          });

          batch.commit();
        }
      });
    }
  }, [user, isUserLoading, auth, db, profile, pathname, router, isMounted]);

  if (!isMounted) {
    return null;
  }

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando sessão segura...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
