
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useState, useMemo, useCallback, useEffect } from "react"
import { Loader2, Zap, ClipboardCheck, Trash2, Save, History } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "plantao_ai_personal_draft";

interface RowData {
  id: string;
  unitName: string;
  sector: string;
  categoryName: string;
  subcategoryName: string;
  itemName: string;
  freeText: string;
  details: string;
}

interface CatalogItem {
  id: string;
  name: string;
}

export default function PersonalRegistryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()

  // Queries para dados dinâmicos do catálogo do usuário
  const categories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "categories") : null, [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "subcategories") : null, [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "items") : null, [db, user?.uid]));
  const units = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "units") : null, [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "sectors") : null, [db, user?.uid]));

  const [rows, setRows] = useState<RowData[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false);

  // Inicialização e Carregamento de Rascunho
  useEffect(() => {
    if (!user?.uid) return;
    const saved = localStorage.getItem(`${STORAGE_KEY}_${user.uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
          setIsLoadedFromDraft(true);
          return;
        }
      } catch (e) {
        console.error("Erro ao carregar rascunho", e);
      }
    }
    setRows([{ 
      id: Math.random().toString(36).substr(2, 9), 
      unitName: "", 
      sector: "", 
      categoryName: "", 
      subcategoryName: "", 
      itemName: "", 
      freeText: "", 
      details: "" 
    }]);
  }, [user?.uid]);

  // Auto-Save do Rascunho
  useEffect(() => {
    if (rows.length > 0 && user?.uid) {
      localStorage.setItem(`${STORAGE_KEY}_${user.uid}`, JSON.stringify(rows));
    }
  }, [rows, user?.uid]);

  const updateRow = useCallback((id: string, updates: Partial<RowData>) => {
    setRows(prev => {
      const newRows = prev.map(row => row.id === id ? { ...row, ...updates } : row);
      const changedRow = newRows.find(r => r.id === id);
      const isLast = newRows.length > 0 && newRows[newRows.length - 1].id === id;
      
      const hasAnyData = changedRow && Object.values(updates).some(v => v !== "");

      if (isLast && hasAnyData) {
        return [
          ...newRows,
          { 
            id: Math.random().toString(36).substr(2, 9), 
            unitName: "", 
            sector: "", 
            categoryName: "", 
            subcategoryName: "", 
            itemName: "", 
            freeText: "", 
            details: "" 
          }
        ];
      }
      return newRows;
    });
  }, []);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchSave = async () => {
    const rowsToSave = rows.filter(r => r.categoryName && (r.freeText || r.details));

    if (rowsToSave.length === 0) {
      toast({ title: "Nenhum dado válido", description: "Preencha ao menos uma categoria e um relato/resolução.", variant: "destructive" });
      return;
    }

    if (!user || !db) return;

    setIsSavingAll(true);
    const batch = writeBatch(db);

    try {
      rowsToSave.forEach((row) => {
        const demandId = Math.random().toString(36).substr(2, 9);
        const demandRef = doc(db, "users", user.uid, "demands", demandId);
        
        batch.set(demandRef, {
          title: `${row.categoryName} - ${row.itemName || row.subcategoryName || 'Geral'}`,
          description: row.freeText || `Demanda de ${row.categoryName}`,
          resolution: row.details || "Pendente",
          id: demandId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          source: 'structured',
          category: row.categoryName,
          subcategory: row.subcategoryName,
          item: row.itemName,
          unit: row.unitName,
          sector: row.sector
        });
      });

      await batch.commit();
      localStorage.removeItem(`${STORAGE_KEY}_${user.uid}`);
      toast({ title: "Plantão Finalizado", description: `${rowsToSave.length} demandas salvas no seu histórico.` });
      router.push("/demands/history");
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro no Salvamento", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-card/50">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Novo Registro de Plantão</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {isLoadedFromDraft && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                  <Save className="w-3 h-3 mr-1" /> Rascunho Recuperado
                </Badge>
              )}
              <Button onClick={handleBatchSave} disabled={isSavingAll} className="gap-2 font-bold shadow-md">
                {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                Finalizar Plantão ({rows.filter(r => r.categoryName && (r.freeText || r.details)).length})
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 bg-slate-50/30">
            <Card className="border shadow-lg flex-1 flex flex-col overflow-hidden bg-card">
              <ScrollArea className="flex-1 w-full">
                <div className="min-w-[1400px]">
                  <Table>
                    <TableHeader className="bg-muted/80 sticky top-0 z-20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider">Unidade</TableHead>
                        <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider">Setor</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-primary">Categoria</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider">Subcategoria</TableHead>
                        <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider">Item</TableHead>
                        <TableHead className="flex-1 text-xs font-bold uppercase tracking-wider">Relato (O que houve?)</TableHead>
                        <TableHead className="w-[300px] text-xs font-bold uppercase tracking-wider">Resolução (O que foi feito?)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.id} className={cn("group transition-colors", index === rows.length - 1 && "border-l-4 border-l-primary/50 bg-primary/5")}>
                          <TableCell className="p-2">
                            <Select value={row.unitName} onValueChange={(val) => updateRow(row.id, { unitName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {units.data?.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                                {units.data?.length === 0 && <SelectItem value="_" disabled>Configure em ajustes</SelectItem>}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          
                          <TableCell className="p-2">
                            <Select value={row.sector} onValueChange={(val) => updateRow(row.id, { sector: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder="Setor..." />
                              </SelectTrigger>
                              <SelectContent>
                                {sectors.data?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                {sectors.data?.length === 0 && <SelectItem value="_" disabled>Configure em ajustes</SelectItem>}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-2">
                            <Select value={row.categoryName} onValueChange={(val) => updateRow(row.id, { categoryName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs font-bold text-primary focus:ring-1">
                                <SelectValue placeholder="Categoria..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.data?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                {categories.data?.length === 0 && <SelectItem value="_" disabled>Configure em ajustes</SelectItem>}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-2">
                            <Select value={row.subcategoryName} onValueChange={(val) => updateRow(row.id, { subcategoryName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder="Subcat..." />
                              </SelectTrigger>
                              <SelectContent>
                                {subcategories.data?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-2">
                            <Select value={row.itemName} onValueChange={(val) => updateRow(row.id, { itemName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder="Item..." />
                              </SelectTrigger>
                              <SelectContent>
                                {items.data?.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-2">
                            <Input 
                              placeholder="Descreva o problema" 
                              className="border-none bg-transparent h-9 text-xs focus:ring-1" 
                              value={row.freeText} 
                              onChange={(e) => updateRow(row.id, { freeText: e.target.value })} 
                            />
                          </TableCell>

                          <TableCell className="p-2">
                            <Input 
                              placeholder="Descreva a solução" 
                              className="border-none bg-transparent h-9 text-xs focus:ring-1" 
                              value={row.details} 
                              onChange={(e) => updateRow(row.id, { details: e.target.value })} 
                            />
                          </TableCell>

                          <TableCell className="p-2">
                            {index !== rows.length - 1 && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" 
                                onClick={() => removeRow(row.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              
              <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex gap-4">
                  <span>Dica: Pressione Enter no último campo para adicionar nova linha.</span>
                  <span className="flex items-center gap-1 font-medium"><History className="w-3 h-3" /> O rascunho é salvo automaticamente em seu navegador.</span>
                </div>
                <div className="font-bold text-primary">Total: {rows.length - 1} registros</div>
              </div>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
