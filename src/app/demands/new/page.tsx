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

const STORAGE_KEY = "plantao_ai_personal_draft_v4";

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

  // Carregar Catálogos (Filtragem em Memória no Cliente para Performance)
  const units = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "units") : null, [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "sectors") : null, [db, user?.uid]));
  const categories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "categories") : null, [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "subcategories") : null, [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "items") : null, [db, user?.uid]));

  const [rows, setRows] = useState<RowData[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
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

      // Adicionar nova linha automática
      const lastRow = updated[updated.length - 1];
      if (lastRow.id === id && (lastRow.categoryId || lastRow.description)) {
        return [...updated, { id: Math.random().toString(36).substr(2, 9), unitId: "", sectorId: "", categoryId: "", subcategoryId: "", itemId: "", description: "", resolution: "" }];
      }
      
      return updated;
    });
  }, []);

  const getRowContextString = (row: RowData) => {
    const cat = categories.data?.find(c => c.id === row.categoryId)?.name || "";
    const sub = subcategories.data?.find(s => s.id === row.subcategoryId)?.name || "";
    const item = items.data?.find(i => i.id === row.itemId)?.name || "";
    const unit = units.data?.find(u => u.id === row.unitId)?.name || "";
    const sector = sectors.data?.find(s => s.id === row.sectorId)?.name || "";

    return `LOCALIZAÇÃO: ${unit} / ${sector} | CATEGORIA: ${cat} | SUBCATEGORIA: ${sub} | ITEM: ${item} | DETALHES: ${row.description} | AÇÃO: ${row.resolution}`.trim();
  }

  const handleAIRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row || (!row.description && !row.categoryId)) return;

    updateRow(id, { isProcessing: true });
    try {
      const result = await processFreeTextDemandWithGemini({ freeText: getRowContextString(row) });
      updateRow(id, { description: result.description, resolution: result.resolution, isProcessing: false });
      toast({ title: "Enriquecido!", description: "Dados profissionalizados pela IA." });
    } catch (e) {
      updateRow(id, { isProcessing: false });
      toast({ title: "IA Indisponível", variant: "destructive" });
    }
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchFinalize = async () => {
    const validRows = rows.filter(r => r.categoryId && (r.description || r.resolution));
    if (validRows.length === 0) {
      toast({ title: "Preencha ao menos um registro.", variant: "destructive" });
      return;
    }

    setIsSavingAll(true);
    setIsGeneratingAI(true);

    try {
      const batch = writeBatch(db);
      
      // 1. Processamento em Lote pela IA (Profissionalização Proativa)
      const enrichedResults = await Promise.all(validRows.map(async (row) => {
        try {
          const aiResult = await processFreeTextDemandWithGemini({ freeText: getRowContextString(row) });
          return { ...row, ...aiResult };
        } catch (e) { return row; }
      }));

      setIsGeneratingAI(false);

      // 2. Persistência no Firestore
      enrichedResults.forEach((row) => {
        const demandId = Math.random().toString(36).substr(2, 9);
        const demandRef = doc(db, "users", user!.uid, "demands", demandId);
        
        batch.set(demandRef, {
          ...row,
          id: demandId,
          userId: user!.uid,
          timestamp: new Date().toISOString(),
          categoryName: categories.data?.find(c => c.id === row.categoryId)?.name || "Geral",
          unitName: units.data?.find(u => u.id === row.unitId)?.name || "",
          source: 'structured'
        });
      });

      await batch.commit();
      localStorage.removeItem(`${STORAGE_KEY}_${user!.uid}`);
      toast({ title: "Plantão Finalizado!", description: `${enrichedResults.length} registros salvos com IA.` });
      router.push("/demands/history");
    } catch (error: any) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSavingAll(false);
      setIsGeneratingAI(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-card/50">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Zap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Meu Plantão Inteligente</h1>
            </div>
            <div className="flex items-center gap-3">
              {isLoadedFromDraft && <Badge variant="outline" className="bg-blue-50 text-blue-600 text-[10px]"><History className="w-3 h-3 mr-1" /> Rascunho</Badge>}
              <Button onClick={handleBatchFinalize} disabled={isSavingAll} className="min-w-[180px] font-bold">
                {isSavingAll ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isGeneratingAI ? "Redigindo..." : "Salvando..."}</> : <><ClipboardCheck className="w-4 h-4 mr-2" /> Finalizar ({validRowsCount(rows)})</>}
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden p-4 bg-slate-50/40 relative">
            {isGeneratingAI && (
              <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <div className="p-8 bg-white shadow-2xl rounded-2xl border flex flex-col items-center gap-4 text-center max-w-sm">
                   <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                   <h3 className="font-bold">Profissionalizando Histórico</h3>
                   <p className="text-xs text-muted-foreground">O Gemini está revisando seus relatos e gerando resoluções técnicas completas.</p>
                </div>
              </div>
            )}

            <Card className="border shadow-lg h-full flex flex-col overflow-hidden bg-card">
              <ScrollArea className="flex-1">
                <div className="min-w-[1500px]">
                  <Table>
                    <TableHeader className="bg-muted/80 sticky top-0 z-20">
                      <TableRow>
                        <TableHead className="w-[180px] text-[10px] font-bold uppercase">Unidade</TableHead>
                        <TableHead className="w-[160px] text-[10px] font-bold uppercase">Setor</TableHead>
                        <TableHead className="w-[180px] text-[10px] font-bold uppercase text-primary">Categoria</TableHead>
                        <TableHead className="w-[180px] text-[10px] font-bold uppercase text-primary">Subcat</TableHead>
                        <TableHead className="w-[160px] text-[10px] font-bold uppercase text-primary">Item</TableHead>
                        <TableHead className="flex-1 text-[10px] font-bold uppercase">Problema</TableHead>
                        <TableHead className="w-[350px] text-[10px] font-bold uppercase">Resolução</TableHead>
                        <TableHead className="w-[50px] text-center">IA</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={row.id} className={cn(idx === rows.length - 1 && "bg-primary/5")}>
                          <TableCell className="p-1">
                            <Select value={row.unitId} onValueChange={(v) => updateRow(row.id, { unitId: v })}>
                              <SelectTrigger className="border-none h-9 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent>{units.data?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={row.sectorId} onValueChange={(v) => updateRow(row.id, { sectorId: v })} disabled={!row.unitId}>
                              <SelectTrigger className="border-none h-9 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent>{sectors.data?.filter(s => s.parentId === row.unitId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, { categoryId: v })}>
                              <SelectTrigger className="border-none h-9 text-xs font-bold text-primary"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent>{categories.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={row.subcategoryId} onValueChange={(v) => updateRow(row.id, { subcategoryId: v })} disabled={!row.categoryId}>
                              <SelectTrigger className="border-none h-9 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent>{subcategories.data?.filter(s => s.parentId === row.categoryId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={row.itemId} onValueChange={(v) => updateRow(row.id, { itemId: v })} disabled={!row.subcategoryId}>
                              <SelectTrigger className="border-none h-9 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent>{items.data?.filter(i => i.parentId === row.subcategoryId).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input placeholder="O que houve?" className="border-none h-9 text-xs" value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input placeholder="O que foi feito?" className="border-none h-9 text-xs" value={row.resolution} onChange={(e) => updateRow(row.id, { resolution: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-1 text-center">
                            <Button size="icon" variant="ghost" onClick={() => handleAIRow(row.id)} disabled={row.isProcessing} className="h-8 w-8 text-primary">
                              {row.isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            </Button>
                          </TableCell>
                          <TableCell className="p-1 text-center">
                            {idx !== rows.length - 1 && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(row.id)}><Trash2 className="w-3 h-3" /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="p-3 bg-muted/20 border-t flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Ao finalizar, a IA revisará e redigirá todos os relatórios automaticamente.</span>
                <span>{rows.length - 1} Itens em Rascunho</span>
              </div>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function validRowsCount(rows: RowData[]) {
  return rows.filter(r => r.categoryId && (r.description || r.resolution)).length;
}
