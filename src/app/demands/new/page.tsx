
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useState, useMemo, useCallback, useEffect } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, Zap, Keyboard, ClipboardCheck, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "plantao_ai_draft_rows";

const normalizeSubs = (subs: any[]): {name: string, items: string[]}[] => {
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, items: [] };
    return { name: s?.name || 'Sem nome', items: s?.items || [] };
  });
};

interface RowData {
  id: string;
  unitName: string;
  sector: string;
  categoryName: string;
  subName: string;
  itemName: string;
  freeText: string;
  details: string;
}

export default function HighPerformanceRegistryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, activeCompanyId } = useUser()
  const router = useRouter()

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return collection(db, "companies", activeCompanyId, "categories");
  }, [db, activeCompanyId]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return collection(db, "companies", activeCompanyId, "units");
  }, [db, activeCompanyId]);

  const { data: categoriesData, isLoading: isCatLoading } = useCollection(categoriesQuery);
  const { data: unitsData, isLoading: isUnitLoading } = useCollection(unitsQuery);

  const activeCategories = useMemo(() => (categoriesData || []).filter(c => c.active), [categoriesData]);
  const activeUnits = useMemo(() => (unitsData || []).filter(u => u.active), [unitsData]);

  const [rows, setRows] = useState<RowData[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;

    const saved = localStorage.getItem(`${STORAGE_KEY}_${activeCompanyId}`);
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
    
    // Initial row creation deferred to client only to avoid hydration mismatch with Math.random()
    setRows([{ 
      id: Math.random().toString(36).substr(2, 9), 
      unitName: "", 
      sector: "", 
      categoryName: "", 
      subName: "", 
      itemName: "", 
      freeText: "", 
      details: ""
    }]);
  }, [activeCompanyId]);

  useEffect(() => {
    if (rows.length > 0 && activeCompanyId) {
      localStorage.setItem(`${STORAGE_KEY}_${activeCompanyId}`, JSON.stringify(rows));
    }
  }, [rows, activeCompanyId]);

  const updateRow = useCallback((id: string, updates: Partial<RowData>) => {
    setRows(prev => {
      const newRows = prev.map(row => row.id === id ? { ...row, ...updates } : row);
      const changedRow = newRows.find(r => r.id === id);
      const isLast = newRows.length > 0 && newRows[newRows.length - 1].id === id;
      const hasData = changedRow && (changedRow.unitName || changedRow.categoryName || changedRow.freeText || changedRow.details);

      if (isLast && hasData) {
        return [
          ...newRows,
          { id: Math.random().toString(36).substr(2, 9), unitName: "", sector: "", categoryName: "", subName: "", itemName: "", freeText: "", details: "" }
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

    if (!user || !db || !activeCompanyId) return;

    setIsSavingAll(true);
    const batch = writeBatch(db);

    try {
      const savePromises = rowsToSave.map(async (row) => {
        const textToProcess = `
          LOCALIZAÇÃO: Unidade ${row.unitName}, Setor ${row.sector}
          CATEGORIA: ${row.categoryName}
          SUBCATEGORIA: ${row.subName || 'Geral'}
          ITEM: ${row.itemName || 'Não especificado'}
          INFORMAÇÃO LIVRE: ${row.freeText}
          DETALHES TÉCNICOS: ${row.details}
        `.trim();

        const aiResult = await processFreeTextDemandWithGemini({ freeText: textToProcess });
        const demandId = Math.random().toString(36).substr(2, 9);
        const demandRef = doc(db, "companies", activeCompanyId, "demands", demandId);
        
        return {
          ref: demandRef,
          data: {
            ...aiResult,
            id: demandId,
            userId: user.uid,
            timestamp: new Date().toISOString(),
            source: 'structured',
            category: row.categoryName,
            subcategory: row.subName,
            item: row.itemName
          }
        };
      });

      const processedResults = await Promise.all(savePromises);
      processedResults.forEach(res => batch.set(res.ref, res.data));
      await batch.commit();

      localStorage.removeItem(`${STORAGE_KEY}_${activeCompanyId}`);
      toast({ title: "Plantão Finalizado", description: `${rowsToSave.length} demandas foram processadas com sucesso.` });
      router.push("/demands/history");
    } catch (error) {
      console.error(error);
      toast({ title: "Erro no Salvamento", description: "Houve um problema ao processar o lote.", variant: "destructive" });
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary fill-primary animate-pulse" />
            <h1 className="text-lg font-semibold font-headline">Plantão de Alta Performance</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isLoadedFromDraft && (
              <Badge variant="outline" className="text-[10px] border-accent text-accent animate-in fade-in zoom-in duration-500 gap-1">
                <Save className="w-3 h-3" /> Rascunho Restaurado
              </Badge>
            )}
            <Button onClick={handleBatchSave} disabled={isSavingAll} className="gap-2 shadow-lg">
              {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              Finalizar Plantão ({rows.filter(r => r.unitName && r.categoryName).length})
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden flex flex-col p-6">
          <Card className="border-none shadow-2xl flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur-md">
            <ScrollArea className="flex-1 w-full">
              <div className="min-w-[1400px]">
                <Table>
                  <TableHeader className="bg-muted/80 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-[180px] text-[10px] font-bold py-4 px-3">Unidade</TableHead>
                      <TableHead className="w-[150px] text-[10px] font-bold px-3">Setor</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold px-3">Categoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold px-3">Subcategoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold px-3">Item</TableHead>
                      <TableHead className="flex-1 text-[10px] font-bold px-3">Relato do Usuário</TableHead>
                      <TableHead className="w-[300px] text-[10px] font-bold px-3">Procedimento Técnico</TableHead>
                      <TableHead className="w-[50px] px-3"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <DemandGridRow 
                        key={row.id} 
                        row={row} 
                        units={activeUnits} 
                        categories={activeCategories}
                        onUpdate={(updates) => updateRow(row.id, updates)}
                        onDelete={() => removeRow(row.id)}
                        isLast={index === rows.length - 1}
                      />
                    ))}
                    {rows.length === 0 && !isUnitLoading && !isCatLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          Iniciando grid de registro...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        </main>
      </SidebarInset>
    </div>
  )
}

function DemandGridRow({ row, units, categories, onUpdate, onDelete, isLast }: { 
  row: RowData, units: any[], categories: any[], onUpdate: (u: Partial<RowData>) => void, onDelete: () => void, isLast: boolean
}) {
  const currentUnit = useMemo(() => units.find(u => u.name === row.unitName), [units, row.unitName]);
  const currentCategory = useMemo(() => categories.find(c => c.name === row.categoryName), [categories, row.categoryName]);
  const currentSubcategories = useMemo(() => normalizeSubs(currentCategory?.subcategories), [currentCategory]);
  const currentSub = useMemo(() => currentSubcategories.find(s => s.name === row.subName), [currentSubcategories, row.subName]);

  return (
    <TableRow className={cn("transition-all group border-b border-border/40 bg-background hover:bg-accent/5", isLast && "border-l-[4px] border-l-primary")}>
      <TableCell className="p-1 px-3">
        <Select value={row.unitName} onValueChange={(val) => onUpdate({ unitName: val, sector: "" })}>
          <SelectTrigger className="border-none shadow-none bg-transparent h-9 text-xs font-medium">
            <SelectValue placeholder="Selecione Unidade" />
          </SelectTrigger>
          <SelectContent>
            {units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1 px-3">
        <Select value={row.sector} onValueChange={(val) => onUpdate({ sector: val })} disabled={!row.unitName}>
          <SelectTrigger className="border-none shadow-none bg-transparent h-9 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            {currentUnit?.sectors?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1 px-3">
        <Select value={row.categoryName} onValueChange={(val) => onUpdate({ categoryName: val, subName: "", itemName: "" })}>
          <SelectTrigger className="border-none shadow-none bg-transparent h-9 text-xs font-semibold text-primary"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1 px-3">
        <Select value={row.subName} onValueChange={(val) => onUpdate({ subName: val, itemName: "" })} disabled={!row.categoryName}>
          <SelectTrigger className="border-none shadow-none bg-transparent h-9 text-xs"><SelectValue placeholder="Subcategoria" /></SelectTrigger>
          <SelectContent>
            {currentSubcategories.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1 px-3">
        <Select value={row.itemName} onValueChange={(val) => onUpdate({ itemName: val })} disabled={!row.subName}>
          <SelectTrigger className="border-none shadow-none bg-transparent h-9 text-xs"><SelectValue placeholder="Atividade" /></SelectTrigger>
          <SelectContent>
            {currentSub?.items?.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1 px-3">
        <Input placeholder="O que aconteceu?" className="border-none shadow-none bg-transparent h-9 text-xs italic" value={row.freeText} onChange={(e) => onUpdate({ freeText: e.target.value })} />
      </TableCell>
      <TableCell className="p-1 px-3">
        <Input placeholder="O que você fez?" className="border-none shadow-none bg-transparent h-9 text-xs" value={row.details} onChange={(e) => onUpdate({ details: e.target.value })} />
      </TableCell>
      <TableCell className="p-1 px-3 text-center">
        {!isLast && <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>}
      </TableCell>
    </TableRow>
  )
}
