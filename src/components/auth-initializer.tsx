
'use client';

import { useEffect } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, profile } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }

    if (user && db && !profile) {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      getDoc(profileRef).then((snap) => {
        if (!snap.exists()) {
          // O primeiro usuário a logar no sistema em modo protótipo ganha admin
          setDoc(profileRef, {
            uid: user.uid,
            role: 'admin',
            email: user.email || 'anonimo@plantaoai.local',
            displayName: user.displayName || 'Plantão Local',
            createdAt: new Date().toISOString()
          });
        }
      });
    }
  }, [user, isUserLoading, auth, db, profile]);

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
