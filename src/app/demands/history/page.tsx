"use client"

import { useMemo, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Filter, Copy, CheckCircle2, Clock, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import Link from "next/link"

interface Demand {
  id: string
  title: string
  description: string
  resolution?: string
  category?: string
  source?: 'free-text' | 'form'
  timestamp?: { seconds: number }
  status?: 'done' | 'pending'
}

export default function HistoryPage() {
  const [search, setSearch] = useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user, profile, activeCompanyId } = useUser()

  const currentCompany = useMemo(() => {
    return profile?.companies?.find((c: any) => c.id === activeCompanyId);
  }, [profile, activeCompanyId]);

  const demandsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;

    try {
      if (activeCompanyId) {
        return query(
          collection(db, "companies", activeCompanyId, "demands"),
          orderBy("timestamp", "desc")
        );
      }

      return query(
        collection(db, "users", user.uid, "demands"),
        orderBy("timestamp", "desc")
      );
    } catch (err) {
      console.error("Erro na query:", err);
      return null;
    }
  }, [db, user?.uid, activeCompanyId]);

  const { data, isLoading } = useCollection(demandsQuery);
  const demands = (data as Demand[]) || [];

  const filteredDemands = useMemo(() => {
    const term = search.toLowerCase();
    return demands.filter(d => 
      (d.title || "").toLowerCase().includes(term) || 
      (d.description || "").toLowerCase().includes(term) ||
      (d.resolution || "").toLowerCase().includes(term)
    );
  }, [demands, search]);

  const copyToClipboard = (demand: Demand) => {
    const text = [
      `*${demand.title}*`,
      `Categoria: ${demand.category || 'Geral'}`,
      ``,
      `> Problema:`,
      `${demand.description}`,
      ``,
      `> Resolução:`,
      `${demand.resolution || 'Pendente'}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    toast({ 
      title: "Copiado com sucesso!", 
      description: "Resumo formatado para WhatsApp/Teams." 
    });
  }

  const formatDate = (seconds?: number) => {
    if (!seconds) return "Data desconhecida";
    return new Date(seconds * 1000).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-bold tracking-tight">
              Histórico {currentCompany ? `(${currentCompany.name})` : "(Pessoal)"}
            </h1>
          </div>
          <Button asChild size="sm" variant="default">
             <Link href="/demands/new">Novo Registro</Link>
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar em títulos, problemas ou resoluções..." 
                className="pl-10 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filtros
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </CardContent>
                </Card>
              ))
            ) : filteredDemands.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <FileText className="w-10 h-10 mb-4 opacity-20" />
                <p>Nenhum registro encontrado {currentCompany ? `em ${currentCompany.name}` : "no seu histórico pessoal"}.</p>
                {search && <Button variant="link" onClick={() => setSearch("")}>Limpar busca</Button>}
              </div>
            ) : (
              filteredDemands.map((demand) => (
                <Card key={demand.id} className="group flex flex-col border shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={demand.source === 'free-text' ? 'secondary' : 'outline'} className="text-[10px] uppercase tracking-wider font-semibold">
                            {demand.category || 'Geral'}
                          </Badge>
                          <span className="flex items-center text-xs text-muted-foreground gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(demand.timestamp?.seconds)}
                          </span>
                        </div>
                        <CardTitle className="text-base font-semibold leading-tight pt-1">
                          {demand.title}
                        </CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(demand)} title="Copiar Resumo">
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-4">
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-transparent group-hover:border-border/50 transition-colors">
                      <p className="line-clamp-3">{demand.description}</p>
                    </div>

                    <div className="mt-auto pt-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 ${demand.resolution ? "text-green-500" : "text-yellow-500"}`} />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground uppercase mb-1">
                            Resolução Técnica
                          </p>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {demand.resolution || "Pendente de documentação..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}