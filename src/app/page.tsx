
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, ClipboardList, Share2, ArrowRight, Loader2, Copy, ShieldCheck, User } from "lucide-react"
import Link from "next/link"
import { useMemoFirebase, useCollection, useUser, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useMemo, useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  const { user, isAdmin, profile, activeCompanyId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const demandsQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return query(
      collection(db, "companies", activeCompanyId, "demands"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
  }, [db, activeCompanyId]);

  const { data: demands, isLoading } = useCollection(demandsQuery);

  // Initialize metrics with safe defaults for SSR
  const [todayMetrics, setTodayMetrics] = useState<{ total: number, ai: number, list: any[] }>({ 
    total: 0, 
    ai: 0, 
    list: [] 
  });

  useEffect(() => {
    if (!demands) {
      setTodayMetrics({ total: 0, ai: 0, list: [] });
      return;
    }

    // Dynamic date calculations must be inside useEffect to avoid hydration mismatch
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const filtered = demands.filter(d => new Date(d.timestamp) >= startOfToday);
    
    setTodayMetrics({ 
      total: filtered.length, 
      ai: filtered.filter(d => d.source === 'free-text').length, 
      list: filtered 
    });
  }, [demands]);

  const copyToClipboard = (demand: any) => {
    const text = `Título: ${demand.title}\n\nDescrição Técnica:\n${demand.description}\n\nResolução:\n${demand.resolution}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Dados prontos para o sistema oficial." });
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Visão Geral do Plantão</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={isAdmin ? "default" : "secondary"} className="gap-1 py-1">
              {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {isAdmin ? "Administrador" : "Usuário"}
            </Badge>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Atendimentos (Hoje)</CardTitle>
                <ClipboardList className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayMetrics.total}</div>
                <p className="text-xs text-muted-foreground">Volume total do dia atual</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Processados por IA (Hoje)</CardTitle>
                <Share2 className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayMetrics.ai}</div>
                <p className="text-xs text-muted-foreground">Otimizados para Help Desk</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Novo Registro</CardTitle>
                <PlusCircle className="w-4 h-4" />
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm" className="w-full mt-2" asChild>
                  <Link href="/demands/new">Abrir Chamado</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline">Atendimentos de Hoje</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demands/history" className="gap-2">
                  Ver Histórico Completo <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
            ) : todayMetrics.list.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2">
                <div className="flex flex-col items-center gap-4">
                  <ClipboardList className="w-12 h-12 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">Nenhum atendimento registrado hoje.</p>
                  <Button asChild><Link href="/demands/new">Registrar Primeira Demanda</Link></Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {todayMetrics.list.map((demand) => (
                  <Card key={demand.id} className="hover:shadow-lg transition-shadow border-none bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg text-primary">{demand.title}</CardTitle>
                          <div className="flex gap-2">
                            <CardDescription className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {demand.category || 'Geral'}</CardDescription>
                            <CardDescription className="text-xs border-l pl-2">{new Date(demand.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => copyToClipboard(demand)}><Copy className="w-3.5 h-3.5" /> Copiar Tudo</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descrição Técnica</span>
                          <p className="text-foreground leading-relaxed">{demand.description}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resolução Aplicada</span>
                          <p className="text-foreground italic leading-relaxed">{demand.resolution}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}
