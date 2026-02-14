"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/firebase"
import { Loader2, PlusCircle } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const { user, isUserLoading, activeCompanyId } = useUser();

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
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-500">Online</p>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}