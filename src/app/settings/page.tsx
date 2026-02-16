
"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, RotateCcw, UserCircle, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

type CatalogType = 'categories' | 'subcategories' | 'items' | 'units' | 'sectors';

interface CatalogItem {
  id: string;
  name: string;
  active: boolean;
}

const DEFAULT_CATALOGS: Record<CatalogType, string[]> = {
  categories: ["Hardware", "Software", "Rede", "Acesso", "Telefonia"],
  subcategories: ["Instalação", "Configuração", "Reparo", "Troca de Senha"],
  items: ["Computador", "Monitor", "Impressora", "E-mail", "Internet"],
  units: ["Hospital Central", "Unidade Norte", "Pronto Atendimento", "Sede Administrativa"],
  sectors: ["TI", "RH", "Faturamento", "Recepção", "Enfermaria"]
};

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const createQuery = (type: CatalogType) => {
    if (!db || !user?.uid) return null;
    return collection(db, "users", user.uid, type);
  };

  const categories = useCollection<CatalogItem>(useMemoFirebase(() => createQuery('categories'), [db, user?.uid]));
  const subcategories = useCollection<CatalogItem>(useMemoFirebase(() => createQuery('subcategories'), [db, user?.uid]));
  const items = useCollection<CatalogItem>(useMemoFirebase(() => createQuery('items'), [db, user?.uid]));
  const units = useCollection<CatalogItem>(useMemoFirebase(() => createQuery('units'), [db, user?.uid]));
  const sectors = useCollection<CatalogItem>(useMemoFirebase(() => createQuery('sectors'), [db, user?.uid]));

  const catalogMap = {
    categories,
    subcategories,
    items,
    units,
    sectors
  };

  const handleAdd = async (type: CatalogType) => {
    const val = newValues[type];
    if (!val?.trim() || !user?.uid || !db) return;
    
    setIsLoading(true);
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "users", user.uid, type, id), { id, name: val, active: true });
      setNewValues(prev => ({ ...prev, [type]: "" }));
      toast({ title: "Item adicionado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (type: CatalogType, id: string) => {
    if (!editValue.trim() || !user?.uid || !db) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid, type, id), { name: editValue }, { merge: true });
      setEditingId(null);
      toast({ title: "Item atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (type: CatalogType, id: string) => {
    if (!user?.uid || !db) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, type, id));
      toast({ title: "Item removido." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  const resetToDefaults = async () => {
    if (!user?.uid || !db || !confirm("Deseja restaurar as configurações padrão? Isso adicionará novos itens à sua lista atual.")) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      Object.entries(DEFAULT_CATALOGS).forEach(([type, items]) => {
        items.forEach(name => {
          const id = Math.random().toString(36).substr(2, 9);
          const ref = doc(db, "users", user.uid, type, id);
          batch.set(ref, { id, name, active: true });
        });
      });
      await batch.commit();
      toast({ title: "Padrões restaurados com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao restaurar." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">Meu Catálogo</h1>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-2" /> Padrões
            </Button>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                <UserCircle className="w-5 h-5" />
                <p className="text-sm">Configurações pessoais para <strong>{user?.email}</strong></p>
              </div>

              <Tabs defaultValue="categories" className="w-full">
                <TabsList className="grid grid-cols-5 h-auto p-1 bg-muted/50">
                  <TabsTrigger value="categories" className="py-2">Categorias</TabsTrigger>
                  <TabsTrigger value="subcategories" className="py-2">Subcategorias</TabsTrigger>
                  <TabsTrigger value="items" className="py-2">Itens</TabsTrigger>
                  <TabsTrigger value="units" className="py-2">Unidades</TabsTrigger>
                  <TabsTrigger value="sectors" className="py-2">Setores</TabsTrigger>
                </TabsList>

                {(Object.keys(catalogMap) as CatalogType[]).map(type => (
                  <TabsContent key={type} value={type} className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="capitalize">{type === 'categories' ? 'Categorias' : type === 'subcategories' ? 'Subcategorias' : type === 'items' ? 'Itens' : type === 'units' ? 'Unidades' : 'Setores'}</CardTitle>
                        <CardDescription>Gerencie suas opções para o registro de demandas.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input 
                            placeholder={`Novo ${type.slice(0, -1)}...`} 
                            value={newValues[type] || ""} 
                            onChange={(e) => setNewValues(prev => ({ ...prev, [type]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                            disabled={isLoading}
                          />
                          <Button onClick={() => handleAdd(type)} disabled={isLoading}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                        </div>

                        <div className="grid gap-2">
                          {catalogMap[type].data?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border group hover:bg-muted/50 transition-colors">
                              {editingId === item.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input 
                                    className="h-8 py-0" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(type, item.id)}>
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-sm font-medium">{item.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditValue(item.name); }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleRemove(type, item.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {catalogMap[type].isLoading && <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>}
                          {catalogMap[type].data?.length === 0 && !catalogMap[type].isLoading && (
                            <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded">Nenhum item cadastrado.</p>
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
