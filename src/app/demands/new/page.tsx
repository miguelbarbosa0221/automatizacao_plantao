
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
import { Loader2, Zap, ClipboardCheck, Trash2, Save, History, Info, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"

const STORAGE_KEY = "plantao_ai_personal_draft_v3";

interface RowData {
  id: string;
  unitId: string;
  sectorId: string;
  categoryId: string;
  subcategoryId: string;
  itemId: string;
  description: string;
  resolution: string;
  isProcessing?: boolean;
  aiTitle?: string;
}

interface CatalogItem {
  id: string;
  name: string;
  parentId?: string;
}

export default function PersonalRegistryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()

  // Carregar Catálogos
  const units = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "units") : null, [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "sectors") : null, [db, user?.uid]));
  const categories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "categories") : null, [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "subcategories") : null, [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "items") : null, [db, user?.uid]));

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
      } catch (e) { console.error("Erro ao carregar rascunho", e); }
    }
    setRows([{ id: Math.random().toString(36).substr(2, 9), unitId: "", sectorId: "", categoryId: "", subcategoryId: "", itemId: "", description: "", resolution: "" }]);
  }, [user?.uid]);

  // Auto-Save do Rascunho
  useEffect(() => {
    if (rows.length > 0 && user?.uid) {
      localStorage.setItem(`${STORAGE_KEY}_${user.uid}`, JSON.stringify(rows));
    }
  }, [rows, user?.uid]);

  const updateRow = useCallback((id: string, updates: Partial<RowData>) => {
    setRows(prev => {
      const updated = prev.map(row => {
        if (row.id !== id) return row;
        
        let newRow = { ...row, ...updates };

        // Lógica de Cascata: Limpar filhos se o pai mudar
        if (updates.unitId !== undefined && updates.unitId !== row.unitId) {
          newRow.sectorId = "";
        }
        if (updates.categoryId !== undefined && updates.categoryId !== row.categoryId) {
          newRow.subcategoryId = "";
          newRow.itemId = "";
        }
        if (updates.subcategoryId !== undefined && updates.subcategoryId !== row.subcategoryId) {
          newRow.itemId = "";
        }

        return newRow;
      });

      // Adicionar nova linha se a última linha foi preenchida
      const lastRow = updated[updated.length - 1];
      const hasAnyData = lastRow.categoryId || lastRow.unitId || lastRow.description;
      
      if (lastRow.id === id && hasAnyData) {
        return [...updated, { id: Math.random().toString(36).substr(2, 9), unitId: "", sectorId: "", categoryId: "", subcategoryId: "", itemId: "", description: "", resolution: "" }];
      }
      
      return updated;
    });
  }, []);

  const handleAIRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    if (!row.description && !row.categoryId) {
      toast({ title: "Dados insuficientes", description: "Preencha ao menos uma categoria ou relato para a IA processar.", variant: "destructive" });
      return;
    }

    // Get names for context
    const catName = categories.data?.find(c => c.id === row.categoryId)?.name || "";
    const subName = subcategories.data?.find(s => s.id === row.subcategoryId)?.name || "";
    const itemName = items.data?.find(i => i.id === row.itemId)?.name || "";
    const unitName = units.data?.find(u => u.id === row.unitId)?.name || "";
    const sectorName = sectors.data?.find(s => s.id === row.sectorId)?.name || "";

    const contextText = `
      LOCALIZAÇÃO: ${unitName} / ${sectorName}
      CATEGORIA: ${catName}
      SUBCATEGORIA: ${subName}
      ITEM: ${itemName}
      DETALHES DO RELATO: ${row.description || "Sem descrição"}
      AÇÃO ATUAL: ${row.resolution || "Pendente"}
    `.trim();

    updateRow(id, { isProcessing: true });

    try {
      const result = await processFreeTextDemandWithGemini({ freeText: contextText });
      updateRow(id, { 
        description: result.description, 
        resolution: result.resolution,
        aiTitle: result.title,
        isProcessing: false 
      });
      toast({ title: "IA: Sucesso!", description: "Dados enriquecidos com inteligência artificial." });
    } catch (e: any) {
      updateRow(id, { isProcessing: false });
      toast({ title: "Erro na IA", description: "Não foi possível processar agora. Tente novamente.", variant: "destructive" });
    }
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchSave = async () => {
    const rowsToSave = rows.filter(r => r.categoryId && (r.description || r.resolution));

    if (rowsToSave.length === 0) {
      toast({ title: "Dados incompletos", description: "Preencha ao menos uma categoria e um relato.", variant: "destructive" });
      return;
    }

    if (!user || !db) return;
    setIsSavingAll(true);
    const batch = writeBatch(db);

    try {
      rowsToSave.forEach((row) => {
        const demandId = Math.random().toString(36).substr(2, 9);
        const demandRef = doc(db, "users", user.uid, "demands", demandId);
        
        const catName = categories.data?.find(c => c.id === row.categoryId)?.name || "";
        const subName = subcategories.data?.find(s => s.id === row.subcategoryId)?.name || "";
        const itemName = items.data?.find(i => i.id === row.itemId)?.name || "";
        const unitName = units.data?.find(u => u.id === row.unitId)?.name || "";
        const sectorName = sectors.data?.find(s => s.id === row.sectorId)?.name || "";

        batch.set(demandRef, {
          id: demandId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          title: row.aiTitle || `${catName} - ${itemName || subName || 'Geral'}`,
          description: row.description || `Demanda de ${catName}`,
          resolution: row.resolution || "Pendente",
          source: 'structured',
          unitId: row.unitId,
          unitName,
          sectorId: row.sectorId,
          sectorName,
          categoryId: row.categoryId,
          categoryName: catName,
          subcategoryId: row.subcategoryId,
          subcategoryName: subName,
          itemId: row.itemId,
          itemName: itemName
        });
      });

      await batch.commit();
      localStorage.removeItem(`${STORAGE_KEY}_${user.uid}`);
      toast({ title: "Plantão Finalizado!", description: `${rowsToSave.length} registros salvos.` });
      router.push("/demands/history");
    } catch (error: any) {
      toast({ title: "Erro no salvamento", description: error.message, variant: "destructive" });
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
              <h1 className="text-lg font-semibold">Meu Plantão Inteligente</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {isLoadedFromDraft && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                  <History className="w-3 h-3 mr-1" /> Rascunho Ativo
                </Badge>
              )}
              <Button onClick={handleBatchSave} disabled={isSavingAll} className="gap-2 font-bold">
                {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                Salvar Tudo ({rows.filter(r => r.categoryId && (r.description || r.resolution)).length})
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/40">
            <Card className="border shadow-lg flex-1 flex flex-col overflow-hidden bg-card">
              <ScrollArea className="flex-1 w-full">
                <div className="min-w-[1500px]">
                  <Table>
                    <TableHeader className="bg-muted/80 sticky top-0 z-20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[180px] text-xs font-bold uppercase">Unidade</TableHead>
                        <TableHead className="w-[160px] text-xs font-bold uppercase">Setor</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase text-primary">Categoria</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase text-primary">Subcategoria</TableHead>
                        <TableHead className="w-[160px] text-xs font-bold uppercase text-primary">Item</TableHead>
                        <TableHead className="flex-1 text-xs font-bold uppercase">Relato do Problema</TableHead>
                        <TableHead className="w-[350px] text-xs font-bold uppercase">Ação Realizada</TableHead>
                        <TableHead className="w-[80px] text-center text-xs font-bold uppercase">IA</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.id} className={cn("group", index === rows.length - 1 && "bg-primary/5")}>
                          <TableCell className="p-1">
                            <Select value={row.unitId} onValueChange={(val) => updateRow(row.id, { unitId: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder="Unidade..." />
                              </SelectTrigger>
                              <SelectContent>
                                {units.data?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          
                          <TableCell className="p-1">
                            <Select value={row.sectorId} onValueChange={(val) => updateRow(row.id, { sectorId: val })} disabled={!row.unitId}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder={row.unitId ? "Setor..." : "---"} />
                              </SelectTrigger>
                              <SelectContent>
                                {sectors.data?.filter(s => s.parentId === row.unitId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-1">
                            <Select value={row.categoryId} onValueChange={(val) => updateRow(row.id, { categoryId: val })}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs font-bold text-primary focus:ring-1">
                                <SelectValue placeholder="Categoria..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-1">
                            <Select value={row.subcategoryId} onValueChange={(val) => updateRow(row.id, { subcategoryId: val })} disabled={!row.categoryId}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder={row.categoryId ? "Subcat..." : "---"} />
                              </SelectTrigger>
                              <SelectContent>
                                {subcategories.data?.filter(s => s.parentId === row.categoryId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-1">
                            <Select value={row.itemId} onValueChange={(val) => updateRow(row.id, { itemId: val })} disabled={!row.subcategoryId}>
                              <SelectTrigger className="border-none bg-transparent h-9 text-xs focus:ring-1">
                                <SelectValue placeholder={row.subcategoryId ? "Item..." : "---"} />
                              </SelectTrigger>
                              <SelectContent>
                                {items.data?.filter(i => i.parentId === row.subcategoryId).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="p-1">
                            <Input 
                              placeholder="Descreva o problema..." 
                              className="border-none bg-transparent h-9 text-xs focus:ring-1" 
                              value={row.description} 
                              onChange={(e) => updateRow(row.id, { description: e.target.value })} 
                            />
                          </TableCell>

                          <TableCell className="p-1">
                            <Input 
                              placeholder="Descreva a solução..." 
                              className="border-none bg-transparent h-9 text-xs focus:ring-1" 
                              value={row.resolution} 
                              onChange={(e) => updateRow(row.id, { resolution: e.target.value })} 
                            />
                          </TableCell>

                          <TableCell className="p-1 text-center">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className={cn(
                                "h-8 w-8 text-primary hover:bg-primary/10 transition-all",
                                row.isProcessing && "animate-pulse"
                              )}
                              onClick={() => handleAIRow(row.id)}
                              disabled={row.isProcessing}
                            >
                              {row.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>

                          <TableCell className="p-1 text-center">
                            {index !== rows.length - 1 && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(row.id)}>
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
              
              <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Clique no ícone de IA (Sparkles) para melhorar o relato e sugerir resoluções.</span>
                </div>
                <div className="text-primary">{rows.length - 1} Registros no Rascunho</div>
              </div>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
