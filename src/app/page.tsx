"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Loader2, PlusCircle, ClipboardList } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

export default function Home() {
  const { user, isUserLoading, activeCompanyId } = useUser();
  const db = useFirestore();

  const demandsQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return query(
      collection(db, "companies", activeCompanyId, "demands"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
  }, [db, activeCompanyId]);

  const { data: demands, isLoading } = useCollection(demandsQuery);

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <Button asChild size="sm">
              <Link href="/demands/new">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Demanda
              </Link>
            </Button>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{user?.email}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Empresa Ativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{activeCompanyId ? "Conectado" : "Nenhuma"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Demandas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{demands?.length || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Últimas Demandas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : demands && demands.length > 0 ? (
                  <div className="space-y-2">
                    {demands.map((demand: any) => (
                      <div key={demand.id} className="p-3 border rounded">
                        <p className="font-medium">{demand.title}</p>
                        <p className="text-sm text-muted-foreground">{demand.category}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma demanda cadastrada. 
                    <Link href="/demands/new" className="text-primary ml-1">Criar primeira demanda</Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}