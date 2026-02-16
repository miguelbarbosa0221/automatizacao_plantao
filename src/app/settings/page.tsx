
"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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

  // Estado para Edição (Renomear)
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
      toast({ title: "Item adicionado!" });
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
      const docRef = doc(db, "users", user.uid, collectionName, id);
      await updateDoc(docRef, { name: name.trim() });
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
        description: "Este item possui dependências. Remova os filhos primeiro." 
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, collectionName, id));
      toast({ title: "Item removido." });
      if (id === selectedUnitId) setSelectedUnitId(null);
      if (id === selectedCategoryId) { setSelectedCategoryId(null); setSelectedSubcategoryId(null); }
      if (id === selectedSubcategoryId) setSelectedSubcategoryId(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  const renderItemActions = (type: string, item: CatalogItem, isSelected: boolean) => (
    <div className="flex items-center gap-1">
      <Button 
        size="icon" variant="ghost" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100", isSelected && "opacity-100")}
        onClick={(e) => { e.stopPropagation(); setRenamingState({ id: item.id, type, name: item.name }); }}
      >
        <Pencil className={cn("w-3 h-3 text-muted-foreground hover:text-primary", isSelected && "text-white/70")} />
      </Button>
      <Button 
        size="icon" variant="ghost" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100", isSelected && "opacity-100")}
        onClick={(e) => { e.stopPropagation(); handleRemove(type, item.id); }}
      >
        <Trash2 className={cn("w-3 h-3 text-muted-foreground hover:text-destructive", isSelected && "text-white/70")} />
      </Button>
    </div>
  );

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
        <div className="flex items-center gap-1">
          {renderItemActions(type, item, isSelected)}
          {(type === 'unit' || type === 'category' || type === 'subcategory') && (
            <ChevronRight className={cn("w-4 h-4 opacity-30 ml-1", isSelected && "opacity-100")} />
          )}
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-xl font-bold tracking-tight">Configurações do Meu Catálogo</h1>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6 bg-slate-50/40">
            <Tabs defaultValue="organizational" className="w-full flex-1 flex flex-col">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="organizational" className="gap-2">
                  <Building2 className="w-4 h-4" /> Estrutura
                </TabsTrigger>
                <TabsTrigger value="taxonomy" className="gap-2">
                  <Tag className="w-4 h-4" /> Classificação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organizational" className="flex-1 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20 border-b">
                      <CardTitle className="text-sm font-bold uppercase">1. Unidades</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="Nova Unidade..." 
                          value={newName.unit} 
                          onChange={(e) => setNewName(prev => ({ ...prev, unit: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdd('unit')}
                          className="h-9 text-xs"
                        />
                        <Button size="sm" onClick={() => handleAdd('unit')} disabled={isLoading}><Plus className="w-4 h-4" /></Button>
                      </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {units.data?.map(unit => (
                          <div 
                            key={unit.id}
                            onClick={() => setSelectedUnitId(unit.id)}
                            className={cn(
                              "flex items-center p-3 rounded-md cursor-pointer group transition-colors",
                              selectedUnitId === unit.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            {renderEditableContent('unit', unit, selectedUnitId === unit.id)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20 border-b">
                      <CardTitle className="text-sm font-bold uppercase">2. Setores</CardTitle>
                      {selectedUnitId ? (
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="Novo Setor..." 
                            value={newName.sector} 
                            onChange={(e) => setNewName(prev => ({ ...prev, sector: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd('sector', selectedUnitId)}
                            className="h-9 text-xs"
                          />
                          <Button size="sm" onClick={() => handleAdd('sector', selectedUnitId)} disabled={isLoading}><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-9 mt-2" />}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedUnitId ? (
                        <div className="p-2 space-y-1">
                          {sectors.data?.filter(s => s.parentId === selectedUnitId).map(sector => (
                            <div key={sector.id} className="flex items-center p-3 rounded-md hover:bg-muted group">
                              {renderEditableContent('sector', sector, false)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-muted-foreground opacity-40">
                          <Building2 className="w-12 h-12 mb-2" />
                          <p className="text-xs">Selecione uma Unidade</p>
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="taxonomy" className="flex-1 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                  <Card className="flex flex-col h-full overflow-hidden border-r">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase">1. Categorias</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="Nova..." value={newName.category} 
                          onChange={(e) => setNewName(prev => ({ ...prev, category: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdd('category')}
                          className="h-8 text-[10px]"
                        />
                        <Button size="icon" className="h-8 w-8" onClick={() => handleAdd('category')}><Plus className="w-4 h-4" /></Button>
                      </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-1 space-y-0.5">
                        {categories.data?.map(cat => (
                          <div 
                            key={cat.id}
                            onClick={() => { setSelectedCategoryId(cat.id); setSelectedSubcategoryId(null); }}
                            className={cn(
                              "flex items-center p-2.5 rounded cursor-pointer group text-xs",
                              selectedCategoryId === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            {renderEditableContent('category', cat, selectedCategoryId === cat.id)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>

                  <Card className="flex flex-col h-full overflow-hidden border-r">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase">2. Subcategorias</CardTitle>
                      {selectedCategoryId ? (
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="Nova..." value={newName.subcategory} 
                            onChange={(e) => setNewName(prev => ({ ...prev, subcategory: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd('subcategory', selectedCategoryId)}
                            className="h-8 text-[10px]"
                          />
                          <Button size="icon" className="h-8 w-8" onClick={() => handleAdd('subcategory', selectedCategoryId)}><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-8 mt-2" />}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedCategoryId ? (
                        <div className="p-1 space-y-0.5">
                          {subcategories.data?.filter(s => s.parentId === selectedCategoryId).map(sub => (
                            <div 
                              key={sub.id}
                              onClick={() => setSelectedSubcategoryId(sub.id)}
                              className={cn(
                                "flex items-center p-2.5 rounded cursor-pointer group text-xs",
                                selectedSubcategoryId === sub.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                              )}
                            >
                              {renderEditableContent('subcategory', sub, selectedSubcategoryId === sub.id)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground opacity-30 text-[10px]">
                          <Info className="w-6 h-6 mb-1" /> Selecione uma Categoria
                        </div>
                      )}
                    </ScrollArea>
                  </Card>

                  <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase">3. Itens (Ação)</CardTitle>
                      {selectedSubcategoryId ? (
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="Novo..." value={newName.item} 
                            onChange={(e) => setNewName(prev => ({ ...prev, item: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd('item', selectedSubcategoryId)}
                            className="h-8 text-[10px]"
                          />
                          <Button size="icon" className="h-8 w-8" onClick={() => handleAdd('item', selectedSubcategoryId)}><Plus className="w-4 h-4" /></Button>
                        </div>
                      ) : <div className="h-8 mt-2" />}
                    </CardHeader>
                    <ScrollArea className="flex-1">
                      {selectedSubcategoryId ? (
                        <div className="p-1 space-y-0.5">
                          {items.data?.filter(i => i.parentId === selectedSubcategoryId).map(item => (
                            <div key={item.id} className="flex items-center p-2.5 rounded hover:bg-muted group text-xs">
                              {renderEditableContent('item', item, false)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground opacity-30 text-[10px]">
                          <Layers className="w-6 h-6 mb-1" /> Selecione uma Subcategoria
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-amber-800 text-[10px]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                <strong>Gestão Hierárquica:</strong> Você pode adicionar, remover e agora renomear qualquer item clicando no ícone do lápis. 
                Ao renomear uma Categoria, seus vínculos com Subcategorias e Itens permanecem intactos.
              </p>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
