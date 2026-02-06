"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, ClipboardList, Share2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Demand, getDemands } from "@/lib/demand-store"

export default function Home() {
  const [recentDemands, setRecentDemands] = useState<Demand[]>([])

  useEffect(() => {
    setRecentDemands(getDemands().slice(0, 5))
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Visão Geral</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Atendimentos Hoje</CardTitle>
                <PlusCircle className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentDemands.length}</div>
                <p className="text-xs text-muted-foreground">+2 desde a última hora</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Processados por IA</CardTitle>
                <Share2 className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentDemands.filter(d => d.source === 'free-text').length}</div>
                <p className="text-xs text-muted-foreground">Otimizados para Help Desk</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Novo Chamado</CardTitle>
                <PlusCircle className="w-4 h-4" />
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm" className="w-full mt-2" asChild>
                  <Link href="/demands/new">Começar Registro</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline">Chamados Recentes</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demands/history" className="gap-2">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            
            {recentDemands.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2">
                <div className="flex flex-col items-center gap-4">
                  <ClipboardList className="w-12 h-12 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">Nenhum chamado registrado ainda no plantão atual.</p>
                  <Button asChild>
                    <Link href="/demands/new">Registrar Primeira Demanda</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recentDemands.map((demand) => (
                  <Card key={demand.id} className="hover:shadow-lg transition-shadow border-none">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-md">{demand.title}</CardTitle>
                        <span className="text-xs text-muted-foreground">{new Date(demand.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <CardDescription className="line-clamp-1">{demand.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(`Título: ${demand.title}\nDescrição: ${demand.description}\nResolução: ${demand.resolution}`);
                      }}>Exportar</Button>
                    </CardFooter>
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