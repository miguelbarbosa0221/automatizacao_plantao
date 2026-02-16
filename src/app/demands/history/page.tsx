
"use client"

import { useMemo, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Search, 
  Copy, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  AlertCircle 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Demand {
  id: string
  title: string
  description: string
  resolution?: string
  categoryName?: string
  unitName?: string
  timestamp?: string | { seconds: number }
}

function CopyableBlock({ label, content, toast, isTitle = false }: { label: string, content: string, toast: any, isTitle?: boolean }) {
  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast({ title: `${label} copiado!`, description: "Texto transferido para a área de transferência." });
  }

  return (
    <div 
      onClick={handleCopy}
      className={cn(
        "group relative cursor-pointer rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 p-2 transition-all",
        isTitle ? "p-0 hover:p-2 -ml-2" : ""
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{label}</span>
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>
      <p className={cn(
        "whitespace-pre-wrap leading-relaxed text-foreground/90",
        isTitle ? "text-lg font-bold" : "text-sm"
      )}>
        {content || "---"}
      </p>
    </div>
  )
}

export default function PersonalHistoryPage() {
  const [search, setSearch] = useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  // Estados para Gestão
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null)
  const [deletingDemandId, setDeletingDemandId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

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

  const handleDelete = async () => {
    if (!db || !user?.uid || !deletingDemandId) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "demands", deletingDemandId));
      toast({ title: "Excluído!", description: "O registro foi removido permanentemente." });
    } catch (e) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeletingDemandId(null);
    }
  }

  const handleUpdate = async () => {
    if (!db || !user?.uid || !editingDemand) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "demands", editingDemand.id), {
        title: editingDemand.title,
        description: editingDemand.description,
        resolution: editingDemand.resolution
      });
      toast({ title: "Atualizado!", description: "As alterações foram salvas com sucesso." });
      setEditingDemand(null);
    } catch (e) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
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
              <h1 className="text-lg font-bold">Meu Histórico Pessoal</h1>
            </div>
            <Button asChild size="sm">
               <Link href="/demands/new">Novo Registro</Link>
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6 space-y-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por problema, título ou resolução..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)
              ) : filteredDemands.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhum registro encontrado.</p>
                </div>
              ) : (
                filteredDemands.map((demand) => (
                  <Card key={demand.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tighter">
                              {demand.categoryName || 'Geral'}
                            </Badge>
                            {demand.unitName && (
                              <Badge variant="outline" className="text-[9px] uppercase opacity-70">
                                {demand.unitName}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" /> {formatTimestamp(demand.timestamp)}
                          </span>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingDemand(demand)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={() => setDeletingDemandId(demand.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-3">
                        <CopyableBlock 
                          label="Título do Chamado" 
                          content={demand.title} 
                          toast={toast} 
                          isTitle={true}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-5 space-y-6">
                      <CopyableBlock 
                        label="Relato do Problema" 
                        content={demand.description} 
                        toast={toast} 
                      />
                      
                      <div className="pt-4 border-t border-dashed">
                        <div className="flex items-center gap-2 mb-2">
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                           <span className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Ação e Resolução</span>
                        </div>
                        <CopyableBlock 
                          label="Solução Aplicada" 
                          content={demand.resolution || "Sem resolução detalhada."} 
                          toast={toast} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </main>

          {/* Diálogo de Edição */}
          <Dialog open={!!editingDemand} onOpenChange={(open) => !open && setEditingDemand(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Registro</DialogTitle>
              </DialogHeader>
              {editingDemand && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Chamado</Label>
                    <Input 
                      id="title" 
                      value={editingDemand.title} 
                      onChange={(e) => setEditingDemand({...editingDemand, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descrição do Problema</Label>
                    <Textarea 
                      id="desc" 
                      rows={5}
                      value={editingDemand.description} 
                      onChange={(e) => setEditingDemand({...editingDemand, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="res">Resolução Técnica</Label>
                    <Textarea 
                      id="res" 
                      rows={4}
                      value={editingDemand.resolution || ""} 
                      onChange={(e) => setEditingDemand({...editingDemand, resolution: e.target.value})}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDemand(null)}>Cancelar</Button>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Alerta de Exclusão */}
          <AlertDialog open={!!deletingDemandId} onOpenChange={(open) => !open && setDeletingDemandId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Confirmar Exclusão
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O registro será removido permanentemente do seu histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
