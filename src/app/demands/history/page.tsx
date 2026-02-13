
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, Copy, ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"

export default function HistoryPage() {
  const [search, setSearch] = useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user, activeCompanyId } = useUser()

  const demandsQuery = useMemoFirebase(() => {
    // Proteção: Só executa se houver banco de dados, usuário e uma empresa ativa selecionada
    if (!db || !user?.uid || !activeCompanyId) return null;
    
    return query(
      collection(db, "companies", activeCompanyId, "demands"),
      orderBy("timestamp", "desc")
    );
  }, [db, user?.uid, activeCompanyId]);

  const { data: demands, isLoading } = useCollection(demandsQuery);

  const filteredDemands = (demands || []).filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.description.toLowerCase().includes(search.toLowerCase())
  )

  const copyToClipboard = (demand: any) => {
    const text = `Título: ${demand.title}\n\nDescrição Técnica:\n${demand.description}\n\nResolução:\n${demand.resolution}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Dados do chamado prontos para o Help Desk." });
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Histórico da Organização</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por título ou descrição..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
              </div>
            ) : !activeCompanyId ? (
              <div className="text-center py-20 text-muted-foreground">
                Selecione uma empresa para visualizar o histórico.
              </div>
            ) : filteredDemands.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                Nenhuma demanda encontrada para esta empresa.
              </div>
            ) : (
              filteredDemands.map((demand) => (
                <Card key={demand.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={demand.source === 'free-text' ? 'secondary' : 'outline'}>
                        {demand.source === 'free-text' ? 'Texto Livre' : 'Estruturado'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(demand.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{demand.title}</CardTitle>
                    <CardDescription>{demand.category || 'Geral'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-foreground line-clamp-2">{demand.description}</p>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => copyToClipboard(demand)}>
                          <Copy className="w-4 h-4" /> Copiar
                        </Button>
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
