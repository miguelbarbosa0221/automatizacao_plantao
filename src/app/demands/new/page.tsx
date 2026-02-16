
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
import { Loader2, Zap, ClipboardCheck, Trash2, Save } from "lucide-react"
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
  freeText: string;
  details: string;
}

export default function PersonalRegistryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "users", user.uid, "categories");
  }, [db, user?.uid]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "users", user.uid, "units");
  }, [db, user?.uid]);

  const { data: categoriesData } = useCollection(categoriesQuery);
  const { data: unitsData } = useCollection(unitsQuery);

  const activeCategories = useMemo(() => (categoriesData || []).filter(c => c.active), [categoriesData]);
  const activeUnits = useMemo(() => (unitsData || []).filter(u => u.active), [unitsData]);

  const [rows, setRows] = useState<RowData[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false);

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
    setRows([{ id: Math.random().toString(36).substr(2, 9), unitName: "", sector: "", categoryName: "", freeText: "", details: "" }]);
  }, [user?.uid]);

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
      const hasData = changedRow && (changedRow.unitName || changedRow.categoryName || changedRow.freeText || changedRow.details);

      if (isLast && hasData) {
        return [
          ...newRows,
          { id: Math.random().toString(36).substr(2, 9), unitName: "", sector: "", categoryName: "", freeText: "", details: "" }
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
    const rowsToSave = rows.filter(r => r.unitName && r.categoryName && (r.freeText || r.details));

    if (rowsToSave.length === 0) {
      toast({ title: "Nenhum dado válido", description: "Preencha ao menos uma linha antes de finalizar.", variant: "destructive" });
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
          title: `${row.categoryName} - ${row.unitName}`,
          description: row.freeText || row.details,
          resolution: row.details || "Pendente",
          id: demandId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          source: 'structured',
          category: row.categoryName,
          unit: row.unitName,
          sector: row.sector
        });
      });

      await batch.commit();
      localStorage.removeItem(`${STORAGE_KEY}_${user.uid}`);
      toast({ title: "Plantão Finalizado", description: `${rowsToSave.length} demandas salvas.` });
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
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Meu Plantão Pessoal</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {isLoadedFromDraft && <Badge variant="outline" className="text-[10px]"><Save className="w-3 h-3 mr-1" /> Rascunho</Badge>}
              <Button onClick={handleBatchSave} disabled={isSavingAll} className="gap-2">
                {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                Finalizar ({rows.filter(r => r.unitName && r.categoryName).length})
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden flex flex-col p-6">
            <Card className="border-none shadow-sm flex-1 flex flex-col overflow-hidden bg-card/50">
              <ScrollArea className="flex-1 w-full">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader className="bg-muted sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[200px] text-xs font-bold">Unidade</TableHead>
                        <TableHead className="w-[150px] text-xs font-bold">Setor</TableHead>
                        <TableHead className="w-[200px] text-xs font-bold">Categoria</TableHead>
                        <TableHead className="flex-1 text-xs font-bold">Relato</TableHead>
                        <TableHead className="w-[300px] text-xs font-bold">Resolução</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.id} className={cn("group", index === rows.length - 1 && "border-l-4 border-l-primary")}>
                          <TableCell className="p-2">
                            <Select value={row.unitName} onValueChange={(val) => updateRow(row.id, { unitName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-8 text-xs">
                                <SelectValue placeholder="Unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeUnits.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input placeholder="Setor" className="border-none bg-transparent h-8 text-xs" value={row.sector} onChange={(e) => updateRow(row.id, { sector: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={row.categoryName} onValueChange={(val) => updateRow(row.id, { categoryName: val })}>
                              <SelectTrigger className="border-none bg-transparent h-8 text-xs font-medium text-primary">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input placeholder="O que houve?" className="border-none bg-transparent h-8 text-xs" value={row.freeText} onChange={(e) => updateRow(row.id, { freeText: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input placeholder="O que foi feito?" className="border-none bg-transparent h-8 text-xs" value={row.details} onChange={(e) => updateRow(row.id, { details: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            {index !== rows.length - 1 && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(row.id)}><Trash2 className="w-3 h-3" /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
