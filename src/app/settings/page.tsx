
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
import { Plus, Trash2, Building2, Tags, RotateCcw, X, Pencil, Loader2, ChevronRight, ListPlus, ShieldAlert, Globe, DatabaseZap, Check } from "lucide-react"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// Helper para normalizar subcategorias
const normalizeSubs = (subs: any[]): {name: string, items: string[]}[] => {
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, items: [] };
    return { name: s?.name || 'Sem nome', items: s?.items || [] };
  });
};

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { isAdmin, isUserLoading } = useUser()

  // Queries globais (Root Collections)
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

  const categories = useMemo(() => categoriesData || [], [categoriesData]);
  const units = useMemo(() => unitsData || [], [unitsData]);

  const [newCatName, setNewCatName] = useState("")
  const [catSubs, setCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [tempSubName, setTempSubName] = useState("")
  const [newUnitName, setNewUnitName] = useState("")
  const [unitSectors, setUnitSectors] = useState<string[]>([])
  const [tempSector, setTempSector] = useState("")
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [editTempSub, setEditTempSub] = useState("")
  const [activeSubForItems, setActiveSubForItems] = useState<number | null>(null)
  const [tempItemName, setTempItemName] = useState("")
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [editUnitName, setEditUnitName] = useState("")
  const [editUnitSectors, setEditUnitSectors] = useState<string[]>([])
  const [editTempSector, setEditTempSector] = useState("")
  const [itemToDelete, setItemToDelete] = useState<{type: 'categories' | 'units', id: string} | null>(null)

  // Estado para edição de nome de subcategoria
  const [subEditIndex, setSubEditIndex] = useState<number | null>(null)
  const [subEditValue, setSubEditValue] = useState("")

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <main className="flex flex-col items-center justify-center h-full space-y-4">
            <ShieldAlert className="w-16 h-16 text-destructive opacity-50" />
            <h1 className="text-2xl font-bold font-headline">Acesso Restrito</h1>
            <p className="text-muted-foreground">Você não possui permissões de Administrador para gerenciar o catálogo global.</p>
            <Button asChild><a href="/">Voltar ao Dashboard</a></Button>
          </main>
        </SidebarInset>
      </div>
    )
  }

  const handleAddCategory = () => {
    if (!newCatName.trim() || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "categories", id);
    setDocumentNonBlocking(docRef, { id, name: newCatName.trim(), subcategories: catSubs, active: true }, { merge: true });
    setNewCatName(""); setCatSubs([]);
    toast({ title: "Sucesso", description: "Categoria salva no catálogo global da organização." });
  }

  const handleUpdateCategory = () => {
    if (!editCatName.trim() || !db) return;
    const id = editingCategory?.id || Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "categories", id);
    updateDocumentNonBlocking(docRef, { name: editCatName.trim(), subcategories: editCatSubs });
    setEditingCategory(null);
    setSubEditIndex(null);
    toast({ title: "Sucesso", description: "Categoria global atualizada." });
  }

  const handleAddUnit = () => {
    if (!newUnitName.trim() || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "units", id);
    setDocumentNonBlocking(docRef, { id, name: newUnitName.trim(), sectors: unitSectors, active: true }, { merge: true });
    setNewUnitName(""); setUnitSectors([]);
    toast({ title: "Sucesso", description: "Unidade salva no catálogo global da organização." });
  }

  const handleUpdateUnit = () => {
    if (!editUnitName.trim() || !db) return;
    const id = editingUnit?.id || Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "units", id);
    updateDocumentNonBlocking(docRef, { name: editUnitName.trim(), sectors: editUnitSectors });
    setEditingUnit(null);
    toast({ title: "Sucesso", description: "Unidade global atualizada." });
  }

  const toggleStatus = (type: 'categories' | 'units', id: string, active: boolean) => {
    if (!db) return;
    const docRef = doc(db, type, id);
    updateDocumentNonBlocking(docRef, { active });
    setItemToDelete(null);
  }

  const startRenameSub = (e: React.MouseEvent, index: number, name: string) => {
    e.stopPropagation();
    setSubEditIndex(index);
    setSubEditValue(name);
  }

  const saveRenameSub = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (subEditValue.trim()) {
      const updated = [...editCatSubs];
      updated[index].name = subEditValue.trim();
      setEditCatSubs(updated);
    }
    setSubEditIndex(null);
  }

  const removeSub = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setEditCatSubs(editCatSubs.filter((_, i) => i !== index));
    if (activeSubForItems === index) setActiveSubForItems(null);
    else if (activeSubForItems !== null && activeSubForItems > index) setActiveSubForItems(activeSubForItems - 1);
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Configurações Globais</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary gap-1">
              <Globe className="w-3 h-3" /> Infraestrutura Global
            </Badge>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="categories" className="gap-2"><Tags className="w-4 h-4" /> Categorias</TabsTrigger>
              <TabsTrigger value="units" className="gap-2"><Building2 className="w-4 h-4" /> Unidades</TabsTrigger>
              <TabsTrigger value="trash" className="gap-2"><Trash2 className="w-4 h-4" /> Lixeira</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle>Nova Categoria Global</CardTitle><CardDescription>Disponível para todos os colaboradores.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome Principal</Label>
                      <Input placeholder="Ex: Sistemas Clínicos" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategorias</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Adicionar sub..." value={tempSubName} onChange={(e) => setTempSubName(e.target.value)} onKeyDown={(e) => { if(e.key==='Enter') { setCatSubs([...catSubs, {name: tempSubName, items: []}]); setTempSubName(""); } }} />
                        <Button variant="outline" onClick={() => { if(tempSubName.trim()) { setCatSubs([...catSubs, {name: tempSubName, items: []}]); setTempSubName(""); } }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {catSubs.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {s.name} <X className="w-3 h-3 cursor-pointer" onClick={() => setCatSubs(catSubs.filter((_, idx) => idx !== i))} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full h-11" onClick={handleAddCategory} disabled={!newCatName.trim()}>Salvar na Organização</Button>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle>Catálogo de Serviços Ativo</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isCatLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : categories.filter(c => c.active).length === 0 ? (
                        <p className="text-center py-10 text-muted-foreground text-sm">Nenhuma categoria cadastrada.</p>
                      ) : categories.filter(c => c.active).map(cat => (
                        <div key={cat.id} className="p-3 border rounded-md mb-2 flex justify-between items-center hover:bg-accent/5 transition-colors">
                          <div>
                            <div className="font-bold">{cat.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {normalizeSubs(cat.subcategories).map(s => `${s.name} (${s.items?.length || 0})`).join(" • ")}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setEditCatName(cat.name); setEditCatSubs(normalizeSubs(cat.subcategories)); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'categories', id: cat.id})}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="units" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle>Nova Unidade Global</CardTitle><CardDescription>Mapeamento de setores institucionais.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Unidade</Label>
                      <Input placeholder="Ex: Hospital Central" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Setores</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Adicionar Setor..." value={tempSector} onChange={(e) => setTempSector(e.target.value)} onKeyDown={(e) => { if(e.key==='Enter' && tempSector.trim()){setUnitSectors([...unitSectors, tempSector]); setTempSector("");} }} />
                        <Button variant="outline" onClick={() => { if(tempSector.trim()){setUnitSectors([...unitSectors, tempSector]); setTempSector("");} }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {unitSectors.map((s, i) => (
                          <Badge key={i} variant="outline" className="gap-1">{s} <X className="w-3 h-3 cursor-pointer" onClick={() => setUnitSectors(unitSectors.filter((_, idx) => idx !== i))} /></Badge>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full h-11" onClick={handleAddUnit} disabled={!newUnitName.trim()}>Salvar Unidade</Button>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle>Unidades Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isUnitLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : units.filter(u => u.active).length === 0 ? (
                        <p className="text-center py-10 text-muted-foreground text-sm">Nenhuma unidade cadastrada.</p>
                      ) : units.filter(u => u.active).map(u => (
                        <div key={u.id} className="p-3 border rounded-md mb-2 flex justify-between items-center">
                          <div><div className="font-bold">{u.name}</div><div className="text-[10px] text-muted-foreground">{u.sectors?.join(", ")}</div></div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingUnit(u); setEditUnitName(u.name); setEditUnitSectors(u.sectors || []); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'units', id: u.id})}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trash">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle className="text-destructive">Categorias Inativas</CardTitle></CardHeader>
                  <CardContent>
                    {categories.filter(c => !c.active).length === 0 ? <p className="text-xs text-center text-muted-foreground">Lixeira vazia.</p> : categories.filter(c => !c.active).map(c => (
                      <div key={c.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span className="text-sm">{c.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus('categories', c.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader><CardTitle className="text-destructive">Unidades Inativas</CardTitle></CardHeader>
                  <CardContent>
                    {units.filter(u => !u.active).length === 0 ? <p className="text-xs text-center text-muted-foreground">Lixeira vazia.</p> : units.filter(u => !u.active).map(u => (
                      <div key={u.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span className="text-sm">{u.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus('units', u.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <Dialog open={!!editingCategory} onOpenChange={() => { setEditingCategory(null); setActiveSubForItems(null); setSubEditIndex(null); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Editar Categoria Global</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4 border-r pr-4">
                  <div className="space-y-2">
                    <Label>Nome Principal</Label>
                    <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategorias</Label>
                    <div className="flex gap-2">
                      <Input value={editTempSub} onChange={(e) => setEditTempSub(e.target.value)} placeholder="Nova sub..." />
                      <Button onClick={() => { if(editTempSub.trim()){setEditCatSubs([...editCatSubs, {name: editTempSub, items: []}]); setEditTempSub("");} }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <ScrollArea className="h-[250px] pr-2">
                      {editCatSubs.map((sub, i) => (
                        <div key={i} className={cn(
                          "group flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-all border",
                          activeSubForItems === i ? 'bg-primary/10 border-primary shadow-sm' : 'bg-muted/50 border-transparent hover:bg-accent/10'
                        )} onClick={() => setActiveSubForItems(i)}>
                          <div className="flex-1 min-w-0 mr-2">
                            {subEditIndex === i ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Input 
                                  size={1}
                                  className="h-7 text-xs py-0 px-2"
                                  autoFocus
                                  value={subEditValue}
                                  onChange={(e) => setSubEditValue(e.target.value)}
                                  onKeyDown={(e) => { if(e.key === 'Enter') saveRenameSub(e as any, i); if(e.key === 'Escape') setSubEditIndex(null); }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => saveRenameSub(e, i)}><Check className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <span className="text-sm font-medium truncate block">{sub.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {subEditIndex !== i && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => startRenameSub(e, i, sub.name)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => removeSub(e, i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Badge variant="outline" className="text-[10px] ml-1">{sub.items?.length || 0}</Badge>
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </div>
                <div className="space-y-4">
                  {activeSubForItems !== null ? (
                    <>
                      <div className="flex items-center gap-2 text-primary">
                        <DatabaseZap className="w-5 h-5" />
                        <h3 className="font-bold text-sm">Itens: {editCatSubs[activeSubForItems].name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Adicionar atividade..." value={tempItemName} onChange={(e) => setTempItemName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && tempItemName.trim()) { const updated = [...editCatSubs]; updated[activeSubForItems].items = [...(updated[activeSubForItems].items || []), tempItemName]; setEditCatSubs(updated); setTempItemName(""); } }} />
                        <Button onClick={() => { if (tempItemName.trim()) { const updated = [...editCatSubs]; updated[activeSubForItems].items = [...(updated[activeSubForItems].items || []), tempItemName]; setEditCatSubs(updated); setTempItemName(""); } }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <ScrollArea className="h-[250px] pr-2">
                        {editCatSubs[activeSubForItems].items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-accent/5 rounded mb-1">
                            <span className="text-xs">{item}</span>
                            <X className="w-3 h-3 text-destructive cursor-pointer" onClick={() => { const updated = [...editCatSubs]; updated[activeSubForItems].items = updated[activeSubForItems].items.filter((_, id) => id !== idx); setEditCatSubs(updated); }} />
                          </div>
                        ))}
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <ListPlus className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-xs">Selecione uma subcategoria.</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                <Button onClick={handleUpdateCategory}>Atualizar Globalmente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Editar Unidade Global</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Unidade</Label>
                  <Input value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gerenciar Setores</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Adicionar setor..." value={editTempSector} onChange={(e) => setEditTempSector(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && editTempSector.trim()){ setEditUnitSectors([...editUnitSectors, editTempSector]); setEditTempSector(""); } }} />
                    <Button onClick={() => { if(editTempSector.trim()){ setEditUnitSectors([...editUnitSectors, editTempSector]); setEditTempSector(""); } }}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-2 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {editUnitSectors.map((sector, idx) => (
                        <Badge key={idx} variant="outline" className="gap-1">
                          {sector}
                          <X className="w-3 h-3 cursor-pointer text-destructive" onClick={() => setEditUnitSectors(editUnitSectors.filter((_, i) => i !== idx))} />
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUnit(null)}>Cancelar</Button>
                <Button onClick={handleUpdateUnit}>Atualizar Globalmente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar Globalmente?</AlertDialogTitle>
                <AlertDialogDescription>Este item será movido para a lixeira e ficará indisponível para todos os usuários.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => itemToDelete && toggleStatus(itemToDelete.type, itemToDelete.id, false)}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </SidebarInset>
    </div>
  )
}
