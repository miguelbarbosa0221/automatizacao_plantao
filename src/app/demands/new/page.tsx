
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useState, useMemo, useEffect } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, Wand2, CheckCircle2, Save, Plus, History, Lightbulb, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, where, limit } from "firebase/firestore"
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

  // Queries globais
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
    { id: Math.random().toString(36).substr(2, 9), unitName: "", sector: "", categoryName: "", subName: "", itemName: "", freeText: "", details: "", isProcessing: false, isSaved: false }
  ]);

  const updateRow = (id: string, updates: Partial<RowData>) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row));
  };

  const handleSaveRow = async (row: RowData) => {
    if (!row.categoryName || !row.unitName || (!row.freeText && !row.details)) {
      toast({ title: "Erro", description: "Preencha os campos essenciais da linha.", variant: "destructive" });
      return;
    }

    updateRow(row.id, { isProcessing: true });

    try {
      const textToProcess = `
        LOCALIZAÇÃO: Unidade ${row.unitName}, Setor ${row.sector}
        CATEGORIA: ${row.categoryName}
        SUBCATEGORIA: ${row.subName || 'Geral'}
        ITEM: ${row.itemName || 'Não especificado'}
        INFORMAÇÃO LIVRE: ${row.freeText || 'Relato estruturado'}
        DETALHES DO ATENDIMENTO: ${row.details}
      `.trim();

      const aiResult = await processFreeTextDemandWithGemini({ freeText: textToProcess });
      
      const demandId = row.id;
      const demandRef = doc(db!, "users", user!.uid, "demands", demandId);
      
      const newDemand = {
        ...aiResult,
        id: demandId,
        timestamp: new Date().toISOString(),
        source: 'structured',
        category: row.categoryName,
        subcategory: row.subName,
        item: row.itemName
      };

      setDocumentNonBlocking(demandRef, newDemand, { merge: true });
      
      updateRow(row.id, { isProcessing: false, isSaved: true });
      toast({ title: "Salvo", description: "Demanda registrada e processada." });

      // Instancia nova linha automaticamente se for a última
      if (rows.indexOf(row) === rows.length - 1) {
        setRows(prev => [
          ...prev,
          { id: Math.random().toString(36).substr(2, 9), unitName: "", sector: "", categoryName: "", subName: "", itemName: "", freeText: "", details: "", isProcessing: false, isSaved: false }
        ]);
      }
    } catch (error) {
      updateRow(row.id, { isProcessing: false });
      toast({ title: "Erro", description: "Falha ao processar linha.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary animate-pulse" />
            <h1 className="text-lg font-semibold font-headline">Registro de Alta Performance</h1>
          </div>
          <Badge className="ml-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Modo Fluxo Contínuo</Badge>
        </header>
        
        <main className="flex-1 overflow-hidden flex flex-col p-6">
          <Card className="border-none shadow-xl flex-1 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm">
            <ScrollArea className="flex-1 w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider">Unidade</TableHead>
                      <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-wider">Setor</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider">Categoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider">Subcategoria</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider">Atividade / Item</TableHead>
                      <TableHead className="flex-1 text-[10px] font-bold uppercase tracking-wider">Informação Livre</TableHead>
                      <TableHead className="w-[250px] text-[10px] font-bold uppercase tracking-wider">Resolução Técnica</TableHead>
                      <TableHead className="w-[80px] text-center text-[10px] font-bold uppercase tracking-wider">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <DemandRow 
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
          
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground px-2">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Atendimento Ativo</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-accent" /> Registrado no Sistema</span>
            </div>
            <p>Pressione <kbd className="bg-muted px-1 rounded border">Save</kbd> para instanciar a próxima linha.</p>
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}

function DemandRow({ row, units, categories, onUpdate, onSave, isLast }: { 
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
      "transition-colors group",
      row.isSaved ? "bg-accent/5 opacity-60" : "bg-white",
      isLast && !row.isSaved && "border-l-4 border-l-primary"
    )}>
      {/* Unidade */}
      <TableCell className="p-2">
        <Select value={row.unitName} onValueChange={(val) => onUpdate({ unitName: val, sector: "" })} disabled={row.isSaved}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            {units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Setor */}
      <TableCell className="p-2">
        <Select value={row.sector} onValueChange={(val) => onUpdate({ sector: val })} disabled={!row.unitName || row.isSaved}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            {currentUnit?.sectors?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Categoria */}
      <TableCell className="p-2">
        <Select value={row.categoryName} onValueChange={(val) => onUpdate({ categoryName: val, subName: "", itemName: "" })} disabled={row.isSaved}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Subcategoria */}
      <TableCell className="p-2">
        <Select value={row.subName} onValueChange={(val) => onUpdate({ subName: val, itemName: "" })} disabled={!row.categoryName || row.isSaved}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs">
            <SelectValue placeholder="Sub" />
          </SelectTrigger>
          <SelectContent>
            {currentSubcategories.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Item */}
      <TableCell className="p-2">
        <Select value={row.itemName} onValueChange={(val) => onUpdate({ itemName: val })} disabled={!row.subName || row.isSaved}>
          <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 h-8 text-xs">
            <SelectValue placeholder="Item" />
          </SelectTrigger>
          <SelectContent>
            {currentSub?.items?.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Informação Livre */}
      <TableCell className="p-2">
        <Input 
          placeholder="O que o usuário relatou?" 
          className="border-none shadow-none bg-transparent focus-visible:ring-0 h-8 text-xs italic"
          value={row.freeText}
          onChange={(e) => onUpdate({ freeText: e.target.value })}
          disabled={row.isSaved}
        />
      </TableCell>

      {/* Resolução */}
      <TableCell className="p-2">
        <Input 
          placeholder="Qual foi a solução?" 
          className="border-none shadow-none bg-transparent focus-visible:ring-0 h-8 text-xs"
          value={row.details}
          onChange={(e) => onUpdate({ details: e.target.value })}
          disabled={row.isSaved}
        />
      </TableCell>

      {/* Ações */}
      <TableCell className="p-2 text-center">
        {row.isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        ) : row.isSaved ? (
          <CheckCircle2 className="w-5 h-5 text-accent mx-auto" />
        ) : (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-primary hover:bg-primary/10" 
            onClick={onSave}
          >
            <Save className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
