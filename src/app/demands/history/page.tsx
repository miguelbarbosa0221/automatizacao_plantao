
"use client"

import { useMemo, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
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
  unit?: string
  timestamp?: string | { seconds: number }
  source?: 'free-text' | 'structured'
}

export default function PersonalHistoryPage() {
  const [search, setSearch] = useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const demandsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "users", user.uid, "demands"),
      orderBy("timestamp", "desc")
    );
  }, [db, user?.uid]);

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
    const text = `*${demand.title}*\nLocal: ${demand.unit || 'N/A'}\nProblema: ${demand.description}\nResolução: ${demand.resolution || 'Pendente'}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Dados formatados para transferência." });
  }

  const formatTimestamp = (ts: any) => {
    if (!ts) return "---";
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts.seconds * 1000);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-card/50 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">Meu Histórico</h1>
            </div>
            <Button asChild size="sm">
               <Link href="/demands/new">Novo Registro</Link>
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6 space-y-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar em problemas ou resoluções..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
              ) : filteredDemands.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhum chamado registrado ainda.</p>
                </div>
              ) : (
                filteredDemands.map((demand) => (
                  <Card key={demand.id} className="group relative flex flex-col hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="text-[10px] uppercase">{demand.category || 'Geral'}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTimestamp(demand.timestamp)}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold mt-2">{demand.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded line-clamp-3">
                        {demand.description}
                      </div>
                      <div className="flex items-start gap-2 border-t pt-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <p className="text-xs text-foreground/80 leading-tight">
                          {demand.resolution || "Sem resolução informada."}
                        </p>
                      </div>
                    </CardContent>
                    <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(demand)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
