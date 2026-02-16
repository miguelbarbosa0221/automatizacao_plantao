"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Building2, Layers, Tag, ChevronRight, Info, AlertCircle, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface CatalogItem {
  id: string;
  name: string;
  parentId?: string;
}

const COLLECTION_MAP: Record<string, string> = {
  unit: "units",
  sector: "sectors",
  category: "categories",
  subcategory: "subcategories",
  item: "items"
};

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Seleção
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Estado para Edição Inline
  const [renamingState, setRenamingState] = useState<{ id: string; type: string; name: string } | null>(null);

  // Estados para Novos Itens
  const [newName, setNewName] = useState({
    unit: "",
    sector: "",
    category: "",
    subcategory: "",
    item: ""
  });

  // Carregamento de Coleções
  const units = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "units") : null, [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "sectors") : null, [db, user?.uid]));
  const categories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "categories") : null, [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "subcategories") : null, [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "items") : null, [db, user?.uid]));

  const handleAdd = async (type: string, parentId?: string | null) => {
    const name = newName[type as keyof typeof newName].trim();
    const collectionName = COLLECTION_MAP[type];
    
    if (!name || !user?.uid || !db || !collectionName) return;

    setIsLoading(true);
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "users", user.uid, collectionName, id), {
        id,
        name,
        parentId: parentId || null,
        active: true
      });
      setNewName(prev => ({ ...prev, [type]: "" }));
      toast({ title: "Adicionado com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renamingState || !user?.uid || !db) return;
    const { id, type, name } = renamingState;
    const collectionName = COLLECTION_MAP[type];
    
    if (!name.trim() || !collectionName) return;

    try {
      await updateDoc(doc(db, "users", user.uid, collectionName, id), { name: name.trim() });
      setRenamingState(null);
      toast({ title: "Nome atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao renomear." });
    }
  };

  const handleRemove = async (type: string, id: string) => {
    const collectionName = COLLECTION_MAP[type];
    if (!user?.uid || !db || !collectionName) return;

    const hasChildren = 
      (type === 'unit' && sectors.data?.some(s => s.parentId === id)) ||
      (type === 'category' && subcategories.data?.some(s => s.parentId === id)) ||
      (type === 'subcategory' && items.data?.some(i => i.parentId === id));

    if (hasChildren) {
      toast({ 
        variant: "destructive", 
        title: "Operação Bloqueada", 
        description: "Exclua os itens filhos antes de remover este pai." 
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, collectionName, id));
      toast({ title: "Removido com sucesso!" });
      if (id === selectedUnitId) setSelectedUnitId(null);
      if (id === selectedCategoryId) { setSelectedCategoryId(null); setSelectedSubcategoryId(null); }
      if (id === selectedSubcategoryId) setSelectedSubcategoryId(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  const renderEditableContent = (type: string, item: CatalogItem, isSelected: boolean) => {
    if (renamingState?.id === item.id) {
      return (
        <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <Input 
            autoFocus
            className="h-7 text-xs py-0 px-2"
            value={renamingState.name}
            onChange={(e) => setRenamingState({ ...renamingState, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenamingState(null);
            }}
            onBlur={handleRename}
          />
          <Check className="w-3 h-3 text-green-500 cursor-pointer" onClick={handleRename} />
          <X className="w-3 h-3 text-red-500 cursor-pointer" onClick={() => setRenamingState(null)} />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <span className={cn("truncate flex-1 text-sm", isSelected && "font-bold")}>{item.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setRenamingState({ id: item.id, type, name: item.name }); }}
          >
            <Pencil className={cn("w-3 h-3 text-muted-foreground", isSelected && "text-white/70")} />
          </Button>
          <Button 
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); handleRemove(type, item.id); }}
          >
            <Trash2 className={cn("w-3 h-3 text-muted-foreground", isSelected && "text-white/70")} />
          </Button>
          {(type === 'unit' || type === 'category' || type === 'subcategory') && (
            <ChevronRight className={cn("w-4 h-4 opacity-30 ml-1", isSelected && "opacity-100")} />
          )}
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-xl font-bold tracking-tight">Configurações do Meu Catálogo</h1>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6 bg-slate-50/40">
            <Tabs defaultValue="organizational" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="organizational" className="gap-2"><Building2 className="w-4 h-4" /> Estrutura Organizacional</TabsTrigger>
                <TabsTrigger value="taxonomy" className="gap-2"><Tag className="w-4 h-4" /> Classificação de Demandas</TabsTrigger>
              </TabsList>

              <TabsContent value="organizational" className="flex-1 mt-0 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase">1. Unidades</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Nova Unidade..." value={newName.unit} onChange={(e) => setNewName({...newName, unit: e.target.value})} className="h-9 text-xs" />
                        <Button onClick={() => handleAdd('unit')} disabled={isLoading} size="icon"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {units.data?.map(u => (
                          <div key={u.id} onClick={() => setSelectedUnitId(u.id)} className={cn("flex items-center p-3 rounded-md cursor-pointer group", selectedUnitId === u.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                            {renderEditableContent('unit', u, selectedUnitId === u.id)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase">2. Setores</CardTitle>
                      {selectedUnitId ? (
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="Novo Setor..." value={newName.sector} onChange={(e) => setNewName({...newName, sector: e.target.value})} className="h-9 text-xs" />
                          <Button onClick={() => handleAdd('sector', selectedUnitId)} disabled={isLoading} size="icon"><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-9 mt-2 flex items-center text-[10px] text-muted-foreground uppercase"><Info className="w-3 h-3 mr-1" /> Selecione uma Unidade</div>}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedUnitId ? (
                        <div className="p-2 space-y-1">
                          {sectors.data?.filter(s => s.parentId === selectedUnitId).map(s => (
                            <div key={s.id} className="flex items-center p-3 rounded-md group hover:bg-muted">
                              {renderEditableContent('sector', s, false)}
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex-1 flex flex-col items-center justify-center h-full opacity-20"><Building2 className="w-12 h-12" /></div>}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="taxonomy" className="flex-1 mt-0 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                  {/* Miller Columns: Categorias */}
                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-[10px] font-bold uppercase">1. Categorias</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Nova..." value={newName.category} onChange={(e) => setNewName({...newName, category: e.target.value})} className="h-8 text-xs" />
                        <Button onClick={() => handleAdd('category')} size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-1.5 space-y-0.5">
                        {categories.data?.map(c => (
                          <div key={c.id} onClick={() => { setSelectedCategoryId(c.id); setSelectedSubcategoryId(null); }} className={cn("flex items-center p-2.5 rounded cursor-pointer group text-xs", selectedCategoryId === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                            {renderEditableContent('category', c, selectedCategoryId === c.id)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>

                  {/* Miller Columns: Subcategorias */}
                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-[10px] font-bold uppercase">2. Subcategorias</CardTitle>
                      {selectedCategoryId ? (
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="Nova..." value={newName.subcategory} onChange={(e) => setNewName({...newName, subcategory: e.target.value})} className="h-8 text-xs" />
                          <Button onClick={() => handleAdd('subcategory', selectedCategoryId)} size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-8 mt-2" />}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedCategoryId ? (
                        <div className="p-1.5 space-y-0.5">
                          {subcategories.data?.filter(s => s.parentId === selectedCategoryId).map(s => (
                            <div key={s.id} onClick={() => setSelectedSubcategoryId(s.id)} className={cn("flex items-center p-2.5 rounded cursor-pointer group text-xs", selectedSubcategoryId === s.id ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
                              {renderEditableContent('subcategory', s, selectedSubcategoryId === s.id)}
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex-1 flex flex-col items-center justify-center h-full opacity-10"><Tag className="w-10 h-10" /></div>}
                    </ScrollArea>
                  </Card>

                  {/* Miller Columns: Itens */}
                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-[10px] font-bold uppercase">3. Itens de Ação</CardTitle>
                      {selectedSubcategoryId ? (
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="Novo..." value={newName.item} onChange={(e) => setNewName({...newName, item: e.target.value})} className="h-8 text-xs" />
                          <Button onClick={() => handleAdd('item', selectedSubcategoryId)} size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-8 mt-2" />}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedSubcategoryId ? (
                        <div className="p-1.5 space-y-0.5">
                          {items.data?.filter(i => i.parentId === selectedSubcategoryId).map(i => (
                            <div key={i.id} className="flex items-center p-2.5 rounded group hover:bg-muted text-xs">
                              {renderEditableContent('item', i, false)}
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex-1 flex flex-col items-center justify-center h-full opacity-10"><Layers className="w-10 h-10" /></div>}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            <div className="shrink-0 flex items-center gap-2 bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800 font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>Gerencie seu catálogo técnico através de navegação em cascata. O sistema protege a integridade impedindo exclusão de pais com filhos.</span>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
