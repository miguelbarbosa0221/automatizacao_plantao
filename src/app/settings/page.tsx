
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Building2, Tags, Pencil, Loader2, ChevronRight, ListPlus, ShieldAlert, Check, X } from "lucide-react"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const normalizeSubs = (subs: any[]): {name: string, items: string[]}[] => {
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, items: [] };
    return { name: s?.name || 'Sem nome', items: s?.items || [] };
  });
};

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { isAdmin, activeCompanyId, isUserLoading } = useUser()

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

  const categories = useMemo(() => categoriesData || [], [categoriesData]);
  const units = useMemo(() => unitsData || [], [unitsData]);

  const [newCatName, setNewCatName] = useState("")
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [subEditIndex, setSubEditIndex] = useState<number | null>(null)
  const [subEditValue, setSubEditValue] = useState("")
  const [tempItemName, setTempItemName] = useState("")
  const [activeSubForItems, setActiveSubForItems] = useState<number | null>(null)

  const [newUnitName, setNewUnitName] = useState("")

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <main className="flex flex-col items-center justify-center h-full space-y-4">
            <ShieldAlert className="w-16 h-16 text-destructive opacity-50" />
            <h1 className="text-2xl font-bold">Acesso Restrito</h1>
            <p className="text-muted-foreground">Somente administradores podem gerenciar o catálogo.</p>
          </main>
        </SidebarInset>
      </div>
    )
  }

  const handleAddCategory = () => {
    if (!newCatName.trim() || !db || !activeCompanyId) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "companies", activeCompanyId, "categories", id);
    setDocumentNonBlocking(docRef, { id, name: newCatName.trim(), subcategories: [], active: true }, { merge: true });
    setNewCatName("");
    toast({ title: "Categoria criada" });
  }

  const handleUpdateCategory = () => {
    if (!editCatName.trim() || !db || !activeCompanyId) return;
    const docRef = doc(db, "companies", activeCompanyId, "categories", editingCategory.id);
    updateDocumentNonBlocking(docRef, { name: editCatName.trim(), subcategories: editCatSubs });
    setEditingCategory(null);
    toast({ title: "Categoria atualizada" });
  }

  const handleRenameSub = (index: number) => {
    if (!subEditValue.trim()) return;
    const newSubs = [...editCatSubs];
    newSubs[index] = { ...newSubs[index], name: subEditValue.trim() };
    setEditCatSubs(newSubs);
    setSubEditIndex(null);
  }

  const handleAddSub = (name: string) => {
    if (!name.trim()) return;
    setEditCatSubs([...editCatSubs, { name: name.trim(), items: [] }]);
  }

  const handleAddItem = (index: number) => {
    if (!tempItemName.trim()) return;
    const newSubs = [...editCatSubs];
    newSubs[index].items = [...(newSubs[index].items || []), tempItemName.trim()];
    setEditCatSubs(newSubs);
    setTempItemName("");
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Configurações do Catálogo</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="units">Unidades</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Nova Categoria</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="Ex: Software" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                      <Button onClick={handleAddCategory}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Categorias Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 border-b hover:bg-accent/5 rounded-md transition-colors group">
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{normalizeSubs(cat.subcategories).length} subcategorias</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => { 
                            setEditingCategory(cat); 
                            setEditCatName(cat.name); 
                            setEditCatSubs(normalizeSubs(cat.subcategories)); 
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Editar Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4 flex-1 overflow-auto">
                <div className="space-y-2">
                  <Label>Nome da Categoria</Label>
                  <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-bold">Subcategorias</Label>
                    <Button variant="outline" size="sm" onClick={() => handleAddSub("Nova Subcategoria")} className="gap-2">
                      <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {editCatSubs.map((sub, idx) => (
                      <Card key={idx} className="border-accent/20">
                        <CardHeader className="p-4 bg-accent/5">
                          <div className="flex items-center justify-between group">
                            {subEditIndex === idx ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input 
                                  value={subEditValue} 
                                  onChange={(e) => setSubEditValue(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleRenameSub(idx)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setSubEditIndex(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-bold text-primary">{sub.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => {
                                  setSubEditIndex(idx);
                                  setSubEditValue(sub.name);
                                }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => {
                              const newSubs = [...editCatSubs];
                              newSubs.splice(idx, 1);
                              setEditCatSubs(newSubs);
                            }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {sub.items?.map((item, iIdx) => (
                              <Badge key={iIdx} variant="secondary" className="gap-1 pr-1">
                                {item}
                                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={() => {
                                  const newSubs = [...editCatSubs];
                                  newSubs[idx].items.splice(iIdx, 1);
                                  setEditCatSubs(newSubs);
                                }}>
                                  <X className="w-2 h-2" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Nova atividade..." 
                              value={activeSubForItems === idx ? tempItemName : ""} 
                              onChange={(e) => {
                                setActiveSubForItems(idx);
                                setTempItemName(e.target.value);
                              }}
                              className="h-8 text-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddItem(idx)}
                            />
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleAddItem(idx)}>
                              <ListPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                <Button onClick={handleUpdateCategory}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </div>
  )
}
