
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

// Helper para normalizar subcategorias
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
  const { user } = useUser()
  const router = useRouter()

  // Queries globais (Catálogo Compartilhado)
  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "categories");
  }, [db]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "units");
  }, [db]);

  const { data: categoriesData, isLoading: isCatLoading } = useCollection(categoriesQuery);
  const { data: unitsData, isLoading: isUnitLoading } = useCollection(unitsQuery);

  const activeCategories = useMemo(() => (categoriesData || []).filter(c => c.active), [categoriesData]);
  const activeUnits = useMemo(() => (unitsData || []).filter(u => u.active), [unitsData]);

  // Estado das linhas do Grid
  const [rows, setRows] = useState<RowData[]>([
    { 
      id: Math.random().toString(36).substr(2, 9), 
      unitName: "", 
      sector: "", 
      categoryName: "", 
      subName: "", 
      itemName: "", 
      freeText: "", 
      details: ""
    }
  ]);

  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false);

  // Carrega rascunho do localStorage no mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
          setIsLoadedFromDraft(true);
        }
      } catch (e) {
        console.error("Erro ao carregar rascunho", e);
      }
    }
  }, []);

  // Salva rascunho automaticamente a cada mudança nas linhas
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  const updateRow = useCallback((id: string, updates: Partial<RowData>) => {
    setRows(prev => {
      const newRows = prev.map(row => row.id === id ? { ...row, ...updates } : row);
      
      // Lógica de Alta Performance: Se a linha alterada for a última e tiver algum dado, adiciona uma nova
      const changedRow = newRows.find(r => r.id === id);
      const isLast = newRows[newRows.length - 1].id === id;
      
      const hasData = changedRow && (
        changedRow.unitName || 
        changedRow.categoryName || 
        changedRow.freeText || 
        changedRow.details
      );

      if (isLast && hasData) {
        return [
          ...newRows,
          { 
            id: Math.random().toString(36).substr(2, 9), 
            unitName: "", 
            sector: "", 
            categoryName: "", 
            subName: "", 
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
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchSave = async () => {
    const rowsToSave = rows.filter(r => r.unitName && r.categoryName && (r.freeText || r.details));

    if (rowsToSave.length === 0) {
      toast({ 
        title: "Nenhum dado válido", 
        description: "Preencha ao menos uma linha com Unidade, Categoria e Relato antes de finalizar.", 
        variant: "destructive" 
      });
      return;
    }

    if (!user || !db) return;

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
        const demandRef = doc(db, "users", user.uid, "demands", demandId);
        
        return {
          ref: demandRef,
          data: {
            ...aiResult,
            id: demandId,
            timestamp: new Date().toISOString(),
            source: 'structured',
            category: row.categoryName,
            subcategory: row.subName,
            item: row.itemName
          }
        };
      });

      const processedResults = await Promise.all(savePromises);
      
      processedResults.forEach(res => {
        batch.set(res.ref, res.data);
      });

      await batch.commit();

      // Limpa rascunho após sucesso
      localStorage.removeItem(STORAGE_KEY);

      toast({ 
        title: "Plantão Finalizado", 
        description: `${rowsToSave.length} demandas foram processadas e salvas com sucesso.` 
      });

      router.push("/demands/history");
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erro no Salvamento", 
        description: "Houve um problema ao processar o lote de demandas. Tente novamente.", 
        variant: "destructive" 
      });
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
            <Badge variant="outline" className="hidden sm:flex bg-primary/5 text-primary border-primary/20 gap-1">
              <Keyboard className="w-3 h-3" /> Auto-Save Ativo
            </Badge>
            <Button 
              onClick={handleBatchSave} 
              disabled={isSavingAll}
              className="gap-2 shadow-lg"
            >
              {isSavingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
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
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider py-4 px-3">Unidade</TableHead>
                      <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-wider px-3">Setor</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Categoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Subcategoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Item</TableHead>
                      <TableHead className="flex-1 text-[10px] font-bold uppercase tracking-wider px-3">Relato do Usuário</TableHead>
                      <TableHead className="w-[300px] text-[10px] font-bold uppercase tracking-wider px-3">Procedimento Técnico</TableHead>
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
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
          
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground font-medium px-2">
            <p className="flex items-center gap-1">
              <Save className="w-3 h-3 text-primary" /> 
              O sistema salva rascunhos automaticamente em tempo real. Você pode trocar de página ou fechar o navegador sem perder os dados.
            </p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Editando</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted" /> Nova Linha</span>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}

function DemandGridRow({ row, units, categories, onUpdate, onDelete, isLast }: { 
  row: RowData, 
  units: any[], 
  categories: any[], 
  onUpdate: (u: Partial<RowData>) => void,
  onDelete: () => void,
  isLast: boolean
}) {
  const currentUnit = useMemo(() => units.find(u => u.name === row.unitName), [units, row.unitName]);
  const currentCategory = useMemo(() => categories.find(c => c.name === row.categoryName), [categories, row.categoryName]);
  const currentSubcategories = useMemo(() => normalizeSubs(currentCategory?.subcategories), [currentCategory]);
  const currentSub = useMemo(() => currentSubcategories.find(s => s.name === row.subName), [currentSubcategories, row.subName]);

  return (
    <TableRow className={cn(
      "transition-all group border-b border-border/40",
      "bg-background hover:bg-accent/5",
      isLast && "border-l-[4px] border-l-primary"
    )}>
      {/* Unidade */}
      <TableCell className="p-1 px-3">
        <Select value={row.unitName} onValueChange={(val) => onUpdate({ unitName: val, sector: "" })}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-9 text-xs font-medium">
            <SelectValue placeholder="Selecione Unidade" />
          </SelectTrigger>
          <SelectContent>
            {units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Setor */}
      <TableCell className="p-1 px-3">
        <Select value={row.sector} onValueChange={(val) => onUpdate({ sector: val })} disabled={!row.unitName}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-9 text-xs">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            {currentUnit?.sectors?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Categoria */}
      <TableCell className="p-1 px-3">
        <Select value={row.categoryName} onValueChange={(val) => onUpdate({ categoryName: val, subName: "", itemName: "" })}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-9 text-xs font-semibold text-primary">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Subcategoria */}
      <TableCell className="p-1 px-3">
        <Select value={row.subName} onValueChange={(val) => onUpdate({ subName: val, itemName: "" })} disabled={!row.categoryName}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-9 text-xs">
            <SelectValue placeholder="Subcategoria" />
          </SelectTrigger>
          <SelectContent>
            {currentSubcategories.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Item */}
      <TableCell className="p-1 px-3">
        <Select value={row.itemName} onValueChange={(val) => onUpdate({ itemName: val })} disabled={!row.subName}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-9 text-xs">
            <SelectValue placeholder="Atividade" />
          </SelectTrigger>
          <SelectContent>
            {currentSub?.items?.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Informação Livre */}
      <TableCell className="p-1 px-3">
        <Input 
          placeholder="O que aconteceu?" 
          className="border-none shadow-none bg-transparent focus-visible:ring-0 h-9 text-xs italic"
          value={row.freeText}
          onChange={(e) => onUpdate({ freeText: e.target.value })}
        />
      </TableCell>

      {/* Resolução */}
      <TableCell className="p-1 px-3">
        <Input 
          placeholder="O que você fez?" 
          className="border-none shadow-none bg-transparent focus-visible:ring-0 h-9 text-xs"
          value={row.details}
          onChange={(e) => onUpdate({ details: e.target.value })}
        />
      </TableCell>

      {/* Ações */}
      <TableCell className="p-1 px-3 text-center">
        {!isLast && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full" 
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
