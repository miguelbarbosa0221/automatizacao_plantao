
'use client';

import { useEffect, useState } from 'react';
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
  const [isMounted, setIsMounted] = useState(false);

  // Garante que o componente só processe redirecionamentos após a montagem no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Se não estiver logado e não estiver na página de login, redireciona para login
    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }

    // Se estiver logado mas na página de login, redireciona para a dashboard
    if (!isUserLoading && user && pathname === '/login') {
      router.push('/');
    }

    // Lógica de criação de perfil para usuários autenticados sem registro no banco
    if (user && db && !profile && !isUserLoading) {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
      getDoc(profileRef).then((snap) => {
        if (!snap.exists()) {
          // POLÍTICA DE SEGURANÇA: Todo novo acesso via e-mail é 'user' (Usuário Simples) por padrão.
          // O privilégio de 'admin' deve ser atribuído manualmente no console do Firestore.
          setDoc(profileRef, {
            uid: user.uid,
            role: 'user',
            email: user.email || 'usuario@plantaoai.local',
            displayName: user.displayName || user.email?.split('@')[0] || 'Plantonista',
            createdAt: new Date().toISOString()
          });
        }
      });
    }
  }, [user, isUserLoading, auth, db, profile, pathname, router, isMounted]);

  // Durante a hidratação e carregamento, exibe a tela de validação
  if (!isMounted || isUserLoading) {
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
