
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O redirecionamento é tratado automaticamente pelo AuthInitializer após o sucesso
    } catch (error: any) {
      setIsLoading(false);
      let message = "Verifique suas credenciais de acesso.";
      
      // Mapeamento de erros comuns do Firebase Auth
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos. Acesso restrito a colaboradores autorizados.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Muitas tentativas sem sucesso. Tente novamente mais tarde.";
      }

      toast({ 
        variant: "destructive", 
        title: "Falha na Autenticação", 
        description: message 
      });
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 font-bold text-3xl text-primary">
            <Activity className="w-8 h-8" />
            <span>PlantãoAI</span>
          </div>
          <p className="text-muted-foreground font-medium">Controle de Demandas de TI - Acesso Restrito</p>
        </div>

        <Card className="border-none shadow-2xl">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Login Institucional</CardTitle>
              <CardDescription>O auto-cadastro está desativado. Use as credenciais fornecidas pela administração.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">E-mail Corporativo</Label>
                <Input 
                  id="email-login" 
                  type="email" 
                  placeholder="seu.nome@instituicao.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Senha</Label>
                <Input 
                  id="password-login" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full gap-2 h-11" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                Entrar no Sistema
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
          Este sistema é para uso exclusivo de colaboradores em regime de plantão. 
          Solicite seu acesso diretamente com o gestor da área.
        </p>
      </div>
    </div>
  );
}
