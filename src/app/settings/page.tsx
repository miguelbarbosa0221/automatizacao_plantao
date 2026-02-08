
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
import { Plus, Trash2, Building2, Tags, RotateCcw, X, Pencil, Loader2, ChevronRight, ListPlus } from "lucide-react"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "categories");
  }, [db, user?.uid]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "units");
  }, [db, user?.uid]);

  const { data: categoriesData, isLoading: isCatLoading } = useCollection(categoriesQuery);
  const { data: unitsData, isLoading: isUnitLoading } = useCollection(unitsQuery);

  const categories = useMemo(() => categoriesData || [], [categoriesData]);
  const units = useMemo(() => unitsData || [], [unitsData]);

  // Estados para nova categoria
  const [newCatName, setNewCatName] = useState("")
  const [catSubs, setCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [tempSubName, setTempSubName] = useState("")

  // Estados para nova unidade
  const [newUnitName, setNewUnitName] = useState("")
  const [unitSectors, setUnitSectors] = useState<string[]>([])
  const [tempSector, setTempSector] = useState("")

  // Edição
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [editTempSub, setEditTempSub] = useState("")
  
  // Gerenciamento de Itens dentro da Subcategoria (Edição)
  const [activeSubForItems, setActiveSubForItems] = useState<number | null>(null)
  const [tempItemName, setTempItemName] = useState("")

  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [editUnitName, setEditUnitName] = useState("")
  const [editUnitSectors, setEditUnitSectors] = useState<string[]>([])
  const [editTempSector, setEditTempSector] = useState("")

  const [itemToDelete, setItemToDelete] = useState<{type: 'categories' | 'units', id: string} | null>(null)

  const handleAddCategory = () => {
    if (!newCatName.trim() || !user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "users", user.uid, "categories", id);
    setDocumentNonBlocking(docRef, { 
      id, 
      name: newCatName.trim(), 
      subcategories: catSubs, 
      active: true 
    }, { merge: true });
    setNewCatName(""); setCatSubs([]);
    toast({ title: "Sucesso", description: "Categoria salva." });
  }

  const handleUpdateCategory = () => {
    if (!editingCategory || !editCatName.trim() || !user || !db) return;
    const docRef = doc(db, "users", user.uid, "categories", editingCategory.id);
    updateDocumentNonBlocking(docRef, { 
      name: editCatName.trim(), 
      subcategories: editCatSubs 
    });
    setEditingCategory(null);
    toast({ title: "Sucesso", description: "Categoria atualizada." });
  }

  const handleAddUnit = () => {
    if (!newUnitName.trim() || !user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "users", user.uid, "units", id);
    setDocumentNonBlocking(docRef, { 
      id, 
      name: newUnitName.trim(), 
      sectors: unitSectors, 
      active: true 
    }, { merge: true });
    setNewUnitName(""); setUnitSectors([]);
    toast({ title: "Sucesso", description: "Unidade salva." });
  }

  const toggleStatus = (type: 'categories' | 'units', id: string, active: boolean) => {
    if (!user || !db) return;
    const docRef = doc(db, "users", user.uid, type, id);
    updateDocumentNonBlocking(docRef, { active });
    setItemToDelete(null);
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Configurações do Plantão</h1>
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
                <Card>
                  <CardHeader><CardTitle>Nova Categoria Principal</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input placeholder="Ex: Sistemas Clínicos" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategorias</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Adicionar sub..." 
                          value={tempSubName} 
                          onChange={(e) => setTempSubName(e.target.value)}
                          onKeyDown={(e) => { if(e.key==='Enter') { setCatSubs([...catSubs, {name: tempSubName, items: []}]); setTempSubName(""); } }}
                        />
                        <Button variant="outline" onClick={() => { setCatSubs([...catSubs, {name: tempSubName, items: []}]); setTempSubName(""); }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {catSubs.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {s.name} <X className="w-3 h-3 cursor-pointer" onClick={() => setCatSubs(catSubs.filter((_, idx) => idx !== i))} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleAddCategory} disabled={!newCatName.trim()}>Salvar Categoria</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Catálogo Ativo</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isCatLoading ? <Loader2 className="animate-spin mx-auto" /> : categories.filter(c => c.active).map(cat => (
                        <div key={cat.id} className="p-3 border rounded-md mb-2 flex justify-between items-center hover:bg-accent/5">
                          <div>
                            <div className="font-bold">{cat.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {cat.subcategories?.map(s => `${s.name} (${s.items?.length || 0} itens)`).join(" • ")}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { 
                              setEditingCategory(cat); 
                              setEditCatName(cat.name); 
                              setEditCatSubs(cat.subcategories || []); 
                            }}><Pencil className="w-4 h-4" /></Button>
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
                <Card>
                  <CardHeader><CardTitle>Nova Unidade</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Nome da Unidade" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
                    <div className="flex gap-2">
                      <Input placeholder="Adicionar Setor..." value={tempSector} onChange={(e) => setTempSector(e.target.value)} />
                      <Button onClick={() => { setUnitSectors([...unitSectors, tempSector]); setTempSector(""); }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unitSectors.map((s, i) => (
                        <Badge key={i} variant="outline" className="gap-1">{s} <X className="w-3 h-3 cursor-pointer" onClick={() => setUnitSectors(unitSectors.filter((_, idx) => idx !== i))} /></Badge>
                      ))}
                    </div>
                    <Button className="w-full" onClick={handleAddUnit} disabled={!newUnitName.trim()}>Salvar Unidade</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Unidades Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isUnitLoading ? <Loader2 className="animate-spin mx-auto" /> : units.filter(u => u.active).map(u => (
                        <div key={u.id} className="p-3 border rounded-md mb-2 flex justify-between items-center">
                          <div><div className="font-bold">{u.name}</div><div className="text-[10px]">{u.sectors?.join(", ")}</div></div>
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
                <Card>
                  <CardHeader><CardTitle className="text-destructive">Categorias Inativas</CardTitle></CardHeader>
                  <CardContent>
                    {categories.filter(c => !c.active).map(c => (
                      <div key={c.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span>{c.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus('categories', c.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-destructive">Unidades Inativas</CardTitle></CardHeader>
                  <CardContent>
                    {units.filter(u => !u.active).map(u => (
                      <div key={u.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span>{u.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus('units', u.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Diálogo Edição Categoria - AGORA COM ITENS */}
          <Dialog open={!!editingCategory} onOpenChange={() => { setEditingCategory(null); setActiveSubForItems(null); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Editar Categoria e Itens</DialogTitle></DialogHeader>
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
                      <Button onClick={() => { setEditCatSubs([...editCatSubs, {name: editTempSub, items: []}]); setEditTempSub(""); }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <ScrollArea className="h-[250px] pr-2">
                      {editCatSubs.map((sub, i) => (
                        <div 
                          key={i} 
                          className={`flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-colors ${activeSubForItems === i ? 'bg-primary/10 border-primary' : 'bg-muted/50 border-transparent'} border`}
                          onClick={() => setActiveSubForItems(i)}
                        >
                          <span className="text-sm font-medium">{sub.name}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">{sub.items?.length || 0} itens</Badge>
                            <ChevronRight className="w-4 h-4" />
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
                        <ListPlus className="w-5 h-5" />
                        <h3 className="font-bold text-sm">Itens de: {editCatSubs[activeSubForItems].name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Adicionar item técnico..." 
                          value={tempItemName} 
                          onChange={(e) => setTempItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                              const updated = [...editCatSubs];
                              updated[activeSubForItems].items = [...(updated[activeSubForItems].items || []), tempItemName];
                              setEditCatSubs(updated);
                              setTempItemName("");
                            }
                          }}
                        />
                        <Button onClick={() => {
                          const updated = [...editCatSubs];
                          updated[activeSubForItems].items = [...(updated[activeSubForItems].items || []), tempItemName];
                          setEditCatSubs(updated);
                          setTempItemName("");
                        }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <ScrollArea className="h-[250px] pr-2">
                        {editCatSubs[activeSubForItems].items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-accent/5 rounded mb-1">
                            <span className="text-xs">{item}</span>
                            <X className="w-3 h-3 text-destructive cursor-pointer" onClick={() => {
                              const updated = [...editCatSubs];
                              updated[activeSubForItems].items = updated[activeSubForItems].items.filter((_, id) => id !== idx);
                              setEditCatSubs(updated);
                            }} />
                          </div>
                        ))}
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <ListPlus className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-xs">Selecione uma subcategoria para gerenciar seus itens específicos.</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                <Button onClick={handleUpdateCategory}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mover para Lixeira?</AlertDialogTitle>
                <AlertDialogDescription>Este item será desativado e não aparecerá nos formulários de demanda.</AlertDialogDescription>
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
