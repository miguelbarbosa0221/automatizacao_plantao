'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Activity, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ 
        variant: "destructive", 
        title: "Campos obrigatórios", 
        description: "Preencha email e senha." 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login realizado com sucesso!" });
      // CORREÇÃO: Redirecionar para /demands/history (rota que existe!)
      router.push('/demands/history');
    } catch (error: any) {
      setIsLoading(false);
      let message = "Verifique suas credenciais.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Email ou senha incorretos.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Muitas tentativas. Tente mais tarde.";
      }

      toast({ 
        variant: "destructive", 
        title: "Erro ao fazer login", 
        description: message 
      });
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 font-bold text-3xl text-primary">
            <Activity className="w-8 h-8" />
            <span>PlantãoAI</span>
          </div>
          <p className="text-muted-foreground font-medium">Gestão Inteligente de Demandas</p>
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
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full gap-2 h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
          Sistema de controle de plantões de TI
        </p>
      </div>
    </div>
  );
}