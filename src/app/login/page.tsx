'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Activity, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Se já estiver logado, redireciona para a home
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha.',
      });
      return;
    }

    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Erro de configuração',
        description:
          'Serviço de autenticação não foi inicializado corretamente.',
      });
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: 'Login realizado com sucesso!',
      });

      // Redireciona explicitamente após login bem-sucedido
      router.push('/');
    } catch (error: unknown) {
      console.error('Erro ao fazer login:', error);

      let message = 'Verifique suas credenciais.';

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
      ) {
        const code = (error as { code: string }).code;

        if (
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-credential'
        ) {
          message = 'Email ou senha incorretos.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Muitas tentativas. Tente mais tarde.';
        } else if (code === 'auth/invalid-email') {
          message = 'Email inválido.';
        }
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: message,
      });
    } finally {
      // Garantir que o loading SEMPRE volte ao normal
      setIsLoading(false);
    }
  };

  // Se já estiver logado, mostra apenas o loader de redirecionamento
  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-3xl font-bold text-primary">
            <Activity className="h-8 w-8" />
            <span>PlantãoAI</span>
          </div>
          <p className="font-medium text-muted-foreground">
            Gestão Inteligente de Demandas
          </p>
        </div>

        <Card className="border shadow-2xl">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Acesso ao Sistema</CardTitle>
              <CardDescription>Entre com suas credenciais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="h-11 w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="px-8 text-center text-xs leading-relaxed text-muted-foreground">
          Sistema de controle de plantões de TI
        </p>
      </div>
    </div>
  );
}