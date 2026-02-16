
"use client";

import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, UserCircle, Pencil, Save, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";

type CatalogType = 'units' | 'sectors' | 'categories' | 'subcategories' | 'items';

interface CatalogItem {
  id: string;
  name: string;
  parentId?: string;
  active: boolean;
}

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, { name: string, parentId: string }>>({
    units: { name: "", parentId: "" },
    sectors: { name: "", parentId: "" },
    categories: { name: "", parentId: "" },
    subcategories: { name: "", parentId: "" },
    items: { name: "", parentId: "" }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", parentId: "" });

  const units = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "units") : null, [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "sectors") : null, [db, user?.uid]));
  const categories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "categories") : null, [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "subcategories") : null, [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => user?.uid ? collection(db, "users", user.uid, "items") : null, [db, user?.uid]));

  const catalogMap = { units, sectors, categories, subcategories, items };

  const handleAdd = async (type: CatalogType) => {
    const data = newValues[type];
    if (!data.name.trim() || !user?.uid || !db) return;
    
    // Validar parentId se não for topo
    if (['sectors', 'subcategories', 'items'].includes(type) && !data.parentId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione o item pai primeiro." });
      return;
    }

    setIsLoading(true);
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "users", user.uid, type, id), { 
        id, 
        name: data.name, 
        parentId: data.parentId || null,
        active: true 
      });
      setNewValues(prev => ({ ...prev, [type]: { name: "", parentId: "" } }));
      toast({ title: "Adicionado com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (type: CatalogType, id: string) => {
    if (!editValue.name.trim() || !user?.uid || !db) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid, type, id), { 
        name: editValue.name,
        parentId: editValue.parentId || null
      }, { merge: true });
      setEditingId(null);
      toast({ title: "Atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (type: CatalogType, id: string) => {
    if (!user?.uid || !db) return;

    // Verificar se tem filhos antes de excluir
    const hasChildren = 
      (type === 'units' && sectors.data?.some(s => s.parentId === id)) ||
      (type === 'categories' && subcategories.data?.some(s => s.parentId === id)) ||
      (type === 'subcategories' && items.data?.some(i => i.parentId === id));

    if (hasChildren) {
      toast({ 
        variant: "destructive", 
        title: "Bloqueado", 
        description: "Este item possui dependências vinculadas. Remova-as primeiro." 
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.uid, type, id));
      toast({ title: "Removido." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  const renderParentSelect = (type: CatalogType, value: string, onChange: (val: string) => void) => {
    if (type === 'units' || type === 'categories') return null;

    let options: CatalogItem[] = [];
    let placeholder = "";

    if (type === 'sectors') { options = units.data || []; placeholder = "Selecione a Unidade"; }
    if (type === 'subcategories') { options = categories.data || []; placeholder = "Selecione a Categoria"; }
    if (type === 'items') { options = subcategories.data || []; placeholder = "Selecione a Subcategoria"; }

    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-9 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">Configurações de Catálogo</h1>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                <UserCircle className="w-5 h-5" />
                <p className="text-sm">Configurando árvore de dados para <strong>{user?.email}</strong></p>
              </div>

              <Tabs defaultValue="units" className="w-full">
                <TabsList className="grid grid-cols-5 h-auto p-1 bg-muted/50">
                  <TabsTrigger value="units">1. Unidades</TabsTrigger>
                  <TabsTrigger value="sectors">2. Setores</TabsTrigger>
                  <TabsTrigger value="categories">3. Categorias</TabsTrigger>
                  <TabsTrigger value="subcategories">4. Subcategorias</TabsTrigger>
                  <TabsTrigger value="items">5. Itens</TabsTrigger>
                </TabsList>

                {(Object.keys(catalogMap) as CatalogType[]).map(type => (
                  <TabsContent key={type} value={type} className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="capitalize">{type}</CardTitle>
                        <CardDescription>
                          {type === 'units' || type === 'categories' 
                            ? "Itens de topo (não possuem pai)." 
                            : `Estes itens dependem de um item superior.`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2 items-end bg-slate-50 p-4 rounded-lg border border-dashed">
                          {renderParentSelect(type, newValues[type].parentId, (val) => setNewValues(prev => ({ ...prev, [type]: { ...prev[type], parentId: val } })))}
                          <div className="flex-1 min-w-[200px]">
                            <Input 
                              placeholder={`Nome do novo ${type.slice(0, -1)}...`} 
                              value={newValues[type].name} 
                              onChange={(e) => setNewValues(prev => ({ ...prev, [type]: { ...prev[type], name: e.target.value } }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                            />
                          </div>
                          <Button onClick={() => handleAdd(type)} disabled={isLoading}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
                        </div>

                        <div className="grid gap-2 mt-4">
                          {catalogMap[type].data?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded border group hover:shadow-sm transition-all">
                              {editingId === item.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  {renderParentSelect(type, editValue.parentId, (val) => setEditValue(prev => ({ ...prev, parentId: val })))}
                                  <Input 
                                    className="h-9" 
                                    value={editValue.name} 
                                    onChange={(e) => setEditValue(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600" onClick={() => handleUpdate(type, item.id)}>
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditingId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{item.name}</span>
                                    {item.parentId && (
                                      <span className="text-[10px] text-muted-foreground uppercase">
                                        Vinculado a: {
                                          type === 'sectors' ? units.data?.find(u => u.id === item.parentId)?.name :
                                          type === 'subcategories' ? categories.data?.find(c => c.id === item.parentId)?.name :
                                          type === 'items' ? subcategories.data?.find(s => s.id === item.parentId)?.name : ""
                                        }
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(item.id); setEditValue({ name: item.name, parentId: item.parentId || "" }); }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemove(type, item.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {catalogMap[type].data?.length === 0 && !catalogMap[type].isLoading && (
                            <div className="text-center py-10 border-2 border-dashed rounded bg-slate-50/50">
                              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-50" />
                              <p className="text-sm text-muted-foreground">Nenhum item cadastrado nesta categoria.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
