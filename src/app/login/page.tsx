
'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      initiateEmailSignIn(auth, email, password);
      toast({ title: "Entrando...", description: "Validando suas credenciais." });
    } catch (error) {
      setIsLoading(false);
      toast({ variant: "destructive", title: "Erro no login", description: "Verifique seu e-mail e senha." });
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    setIsLoading(true);
    try {
      initiateEmailSignUp(auth, email, password);
      toast({ title: "Criando conta...", description: "Seja bem-vindo ao PlantãoAI." });
    } catch (error) {
      setIsLoading(false);
      toast({ variant: "destructive", title: "Erro no cadastro", description: "Não foi possível criar sua conta." });
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
          <p className="text-muted-foreground">Sistema centralizado para gestão de demandas de TI</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>Entre com seu e-mail e senha institucional.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">E-mail</Label>
                    <Input 
                      id="email-login" 
                      type="email" 
                      placeholder="seu.nome@instituicao.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
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
                      required 
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    Acessar Sistema
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Nova Conta</CardTitle>
                  <CardDescription>Crie seu acesso ao sistema de plantão.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">E-mail Corporativo</Label>
                    <Input 
                      id="email-signup" 
                      type="email" 
                      placeholder="nome@instituicao.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Senha (min. 6 dígitos)</Label>
                    <Input 
                      id="password-signup" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="secondary" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    Criar meu Perfil
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Ao acessar, você concorda com as políticas de segurança da TI.
        </p>
      </div>
    </div>
  );
}
