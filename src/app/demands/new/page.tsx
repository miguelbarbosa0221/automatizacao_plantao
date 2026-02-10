
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
import { useState, useMemo, useEffect } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, CheckCircle2, Save, Zap, Keyboard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

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
  isProcessing: boolean;
  isSaved: boolean;
}

export default function HighPerformanceRegistryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

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

  // Estado das linhas do Grid - ID inicial estável para evitar erro de hidratação
  const [rows, setRows] = useState<RowData[]>([
    { 
      id: "initial-row-id", 
      unitName: "", 
      sector: "", 
      categoryName: "", 
      subName: "", 
      itemName: "", 
      freeText: "", 
      details: "", 
      isProcessing: false, 
      isSaved: false 
    }
  ]);

  const updateRow = (id: string, updates: Partial<RowData>) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row));
  };

  const handleSaveRow = async (row: RowData) => {
    if (!row.categoryName || !row.unitName || (!row.freeText && !row.details)) {
      toast({ title: "Dados incompletos", description: "Preencha a categoria, unidade e relato para salvar.", variant: "destructive" });
      return;
    }

    if (!user || !db) {
      toast({ title: "Erro de Sessão", description: "Aguarde a validação do usuário.", variant: "destructive" });
      return;
    }

    if (row.isSaved || row.isProcessing) return;

    updateRow(row.id, { isProcessing: true });

    try {
      const textToProcess = `
        LOCALIZAÇÃO: Unidade ${row.unitName}, Setor ${row.sector}
        CATEGORIA: ${row.categoryName}
        SUBCATEGORIA: ${row.subName || 'Geral'}
        ITEM: ${row.itemName || 'Não especificado'}
        INFORMAÇÃO LIVRE: ${row.freeText}
        DETALHES TÉCNICOS: ${row.details}
      `.trim();

      const aiResult = await processFreeTextDemandWithGemini({ freeText: textToProcess });
      
      // Gera ID real apenas no momento da gravação se for o ID estável inicial
      const targetId = row.id === "initial-row-id" ? Math.random().toString(36).substr(2, 9) : row.id;
      const demandRef = doc(db, "users", user.uid, "demands", targetId);
      
      const newDemand = {
        ...aiResult,
        id: targetId,
        timestamp: new Date().toISOString(),
        source: 'structured',
        category: row.categoryName,
        subcategory: row.subName,
        item: row.itemName
      };

      setDocumentNonBlocking(demandRef, newDemand, { merge: true });
      
      updateRow(row.id, { isProcessing: false, isSaved: true });
      
      // Instancia nova linha automaticamente se for a última sendo salva
      if (rows.findIndex(r => r.id === row.id) === rows.length - 1) {
        setRows(prev => [
          ...prev,
          { 
            id: Math.random().toString(36).substr(2, 9), 
            unitName: "", 
            sector: "", 
            categoryName: "", 
            subName: "", 
            itemName: "", 
            freeText: "", 
            details: "", 
            isProcessing: false, 
            isSaved: false 
          }
        ]);
      }
      
      toast({ title: "Registrado", description: "Demanda salva e processada com sucesso." });
    } catch (error) {
      updateRow(row.id, { isProcessing: false });
      toast({ title: "Erro de Processamento", description: "A IA não conseguiu processar esta linha.", variant: "destructive" });
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
            <h1 className="text-lg font-semibold font-headline">Registro de Alta Performance</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1">
              <Keyboard className="w-3 h-3" /> Tab para navegar
            </Badge>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden flex flex-col p-6">
          <Card className="border-none shadow-2xl flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur-md">
            <ScrollArea className="flex-1 w-full">
              <div className="min-w-[1300px]">
                <Table>
                  <TableHeader className="bg-muted/80 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider py-4 px-3">Unidade</TableHead>
                      <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-wider px-3">Setor</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Categoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Subcategoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider px-3">Item</TableHead>
                      <TableHead className="flex-1 text-[10px] font-bold uppercase tracking-wider px-3">Informação Livre (Relato)</TableHead>
                      <TableHead className="w-[280px] text-[10px] font-bold uppercase tracking-wider px-3">O que foi realizado?</TableHead>
                      <TableHead className="w-[80px] text-center text-[10px] font-bold uppercase tracking-wider px-3">Status</TableHead>
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
                        onSave={() => handleSaveRow(row)}
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
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> Atendimento Ativo</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /> Registrado no Sistema</span>
            </div>
            <p className="flex items-center gap-1"><Zap className="w-3 h-3" /> Ao salvar, o sistema processa os dados via IA e abre uma nova linha automaticamente.</p>
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}

function DemandGridRow({ row, units, categories, onUpdate, onSave, isLast }: { 
  row: RowData, 
  units: any[], 
  categories: any[], 
  onUpdate: (u: Partial<RowData>) => void,
  onSave: () => void,
  isLast: boolean
}) {
  const currentUnit = useMemo(() => units.find(u => u.name === row.unitName), [units, row.unitName]);
  const currentCategory = useMemo(() => categories.find(c => c.name === row.categoryName), [categories, row.categoryName]);
  const currentSubcategories = useMemo(() => normalizeSubs(currentCategory?.subcategories), [currentCategory]);
  const currentSub = useMemo(() => currentSubcategories.find(s => s.name === row.subName), [currentSubcategories, row.subName]);

  return (
    <TableRow className={cn(
      "transition-all group border-b border-border/40",
      row.isSaved ? "bg-accent/5 opacity-50 grayscale-[0.5]" : "bg-background hover:bg-accent/5",
      isLast && !row.isSaved && "border-l-[4px] border-l-primary"
    )}>
      {/* Unidade */}
      <TableCell className="p-1 px-3">
        <Select value={row.unitName} onValueChange={(val) => onUpdate({ unitName: val, sector: "" })} disabled={row.isSaved}>
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
        <Select value={row.sector} onValueChange={(val) => onUpdate({ sector: val })} disabled={!row.unitName || row.isSaved}>
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
        <Select value={row.categoryName} onValueChange={(val) => onUpdate({ categoryName: val, subName: "", itemName: "" })} disabled={row.isSaved}>
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
        <Select value={row.subName} onValueChange={(val) => onUpdate({ subName: val, itemName: "" })} disabled={!row.categoryName || row.isSaved}>
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
        <Select value={row.itemName} onValueChange={(val) => onUpdate({ itemName: val })} disabled={!row.subName || row.isSaved}>
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
          disabled={row.isSaved}
        />
      </TableCell>

      {/* Resolução */}
      <TableCell className="p-1 px-3">
        <Input 
          placeholder="O que você fez?" 
          className="border-none shadow-none bg-transparent focus-visible:ring-0 h-9 text-xs"
          value={row.details}
          onChange={(e) => onUpdate({ details: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !row.isSaved) {
              onSave();
            }
          }}
          disabled={row.isSaved}
        />
      </TableCell>

      {/* Status/Ações */}
      <TableCell className="p-1 px-3 text-center">
        {row.isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        ) : row.isSaved ? (
          <CheckCircle2 className="w-5 h-5 text-accent mx-auto animate-in zoom-in-50 duration-300" />
        ) : (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" 
            onClick={onSave}
          >
            <Save className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
