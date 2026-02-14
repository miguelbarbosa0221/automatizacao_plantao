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
import { collection, query, orderBy, Timestamp } from "firebase/firestore"
import Link from "next/link"

// Interface para garantir que sabemos o que estamos manipulando
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
  const { user } = useUser()

  // 1. Query Segura (Mantém a correção do bug de permissão)
  const demandsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;

    try {
      return query(
        collection(db, "users", user.uid, "demands"),
        orderBy("timestamp", "desc")
      );
    } catch (err) {
      console.error("Erro na query:", err);
      return null;
    }
  }, [db, user?.uid]);

  const { data, isLoading } = useCollection(demandsQuery);
  const demands = (data as Demand[]) || [];

  // 2. Filtragem Otimizada com useMemo
  const filteredDemands = useMemo(() => {
    const term = search.toLowerCase();
    return demands.filter(d => 
      (d.title || "").toLowerCase().includes(term) || 
      (d.description || "").toLowerCase().includes(term) ||
      (d.resolution || "").toLowerCase().includes(term)
    );
  }, [demands, search]);

  // 3. Função de Copiar Melhorada
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

  // 4. Formatador de Data
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
        {/* Header Fixo */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-bold tracking-tight">Histórico de Atendimentos</h1>
          </div>
          <Button asChild size="sm" variant="default">
             <Link href="/demands/new">Novo Registro</Link>
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          {/* Barra de Busca */}
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

          {/* Lista de Cards */}
          <div className="grid gap-4 md:grid-cols