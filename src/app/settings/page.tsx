
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
import { Plus, Trash2, Building2, Tags, RotateCcw, X, Pencil, Loader2 } from "lucide-react"
import { useState } from "react"
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

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  // Firestore Collections com memorização rigorosa
  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "categories");
  }, [db, user?.uid]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "units");
  }, [db, user?.uid]);

  const { data: categories, isLoading: isCatLoading } = useCollection(categoriesQuery);
  const { data: units, isLoading: isUnitLoading } = useCollection(unitsQuery);

  // Estados locais para formulários de criação
  const [newCatName, setNewCatName] = useState("")
  const [catSubsList, setCatSubsList] = useState<string[]>([])
  const [currentSub, setCurrentSub] = useState("")

  const [newUnitName, setNewUnitName] = useState("")
  const [unitSectorsList, setUnitSectorsList] = useState<string[]>([])
  const [currentSector, setCurrentSector] = useState("")

  // Estados locais para edição
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<string[]>([])
  const [editCurrentSub, setEditCurrentSub] = useState("")

  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [editUnitName, setEditUnitName] = useState("")
  const [editUnitSectors, setEditUnitSectors] = useState<string[]>([])
  const [editCurrentSector, setEditCurrentSector] = useState("")

  // CRUD Categorias
  const handleAddCategory = () => {
    if (!newCatName.trim() || !user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "users", user.uid, "categories", id);
    setDocumentNonBlocking(docRef, { 
      id, 
      name: newCatName.trim(), 
      subcategories: catSubsList, 
      active: true 
    }, { merge: true });
    setNewCatName(""); 
    setCatSubsList([]);
    toast({ title: "Sucesso", description: "Categoria salva no banco de dados." });
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

  // CRUD Unidades
  const handleAddUnit = () => {
    if (!newUnitName.trim() || !user || !db) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "users", user.uid, "units", id);
    setDocumentNonBlocking(docRef, { 
      id, 
      name: newUnitName.trim(), 
      sectors: unitSectorsList, 
      active: true 
    }, { merge: true });
    setNewUnitName(""); 
    setUnitSectorsList([]);
    toast({ title: "Sucesso", description: "Unidade salva no banco de dados." });
  }

  const handleUpdateUnit = () => {
    if (!editingUnit || !editUnitName.trim() || !user || !db) return;
    const docRef = doc(db, "users", user.uid, "units", editingUnit.id);
    updateDocumentNonBlocking(docRef, { 
      name: editUnitName.trim(), 
      sectors: editUnitSectors 
    });
    setEditingUnit(null);
    toast({ title: "Sucesso", description: "Unidade atualizada." });
  }

  const toggleStatus = (type: 'categories' | 'units', id: string, active: boolean) => {
    if (!user || !db) return;
    const docRef = doc(db, "users", user.uid, type, id);
    updateDocumentNonBlocking(docRef, { active });
  }

  const deletePermanent = (type: 'categories' | 'units', id: string) => {
    if (!user || !db) return;
    const docRef = doc(db, "users", user.uid, type, id);
    deleteDocumentNonBlocking(docRef);
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Configurações Sincronizadas</h1>
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
                  <CardHeader><CardTitle>Nova Categoria</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Ex: Hardware" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Subcategoria..." 
                        value={currentSub} 
                        onChange={(e) => setCurrentSub(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentSub.trim()) {
                            setCatSubsList([...catSubsList, currentSub.trim()]);
                            setCurrentSub("");
                          }
                        }}
                      />
                      <Button onClick={() => { if(currentSub.trim()) { setCatSubsList([...catSubsList, currentSub.trim()]); setCurrentSub(""); } }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {catSubsList.map((s, idx) => (
                        <Badge key={`${s}-${idx}`} variant="secondary">
                          {s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setCatSubsList(catSubsList.filter((_, i) => i !== idx))} />
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full" onClick={handleAddCategory} disabled={!newCatName.trim()}>Salvar no Firestore</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isCatLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                      ) : (categories || []).filter(c => c.active).length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground text-sm">Nenhuma categoria cadastrada.</div>
                      ) : (categories || []).filter(c => c.active).map(cat => (
                        <div key={cat.id} className="p-3 border rounded-md mb-2 flex justify-between items-center bg-card">
                          <div>
                            <div className="font-bold">{cat.name}</div>
                            <div className="text-[10px] text-muted-foreground">{cat.subcategories?.join(", ") || "Sem subcategorias"}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { 
                              setEditingCategory(cat); 
                              setEditCatName(cat.name); 
                              setEditCatSubs(cat.subcategories || []); 
                            }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => toggleStatus('categories', cat.id, false)}><Trash2 className="w-4 h-4" /></Button>
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
                    <Input placeholder="Ex: Hospital Central" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Setor..." 
                        value={currentSector} 
                        onChange={(e) => setCurrentSector(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentSector.trim()) {
                            setUnitSectorsList([...unitSectorsList, currentSector.trim()]);
                            setCurrentSector("");
                          }
                        }}
                      />
                      <Button onClick={() => { if(currentSector.trim()) { setUnitSectorsList([...unitSectorsList, currentSector.trim()]); setCurrentSector(""); } }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unitSectorsList.map((s, idx) => (
                        <Badge key={`${s}-${idx}`} variant="outline">
                          {s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setUnitSectorsList(unitSectorsList.filter((_, i) => i !== idx))} />
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full" onClick={handleAddUnit} disabled={!newUnitName.trim()}>Salvar no Firestore</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isUnitLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                      ) : (units || []).filter(u => u.active).length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground text-sm">Nenhuma unidade cadastrada.</div>
                      ) : (units || []).filter(u => u.active).map(unit => (
                        <div key={unit.id} className="p-3 border rounded-md mb-2 flex justify-between items-center bg-card">
                          <div>
                            <div className="font-bold">{unit.name}</div>
                            <div className="text-[10px] text-muted-foreground">{unit.sectors?.join(", ") || "Sem setores"}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { 
                              setEditingUnit(unit); 
                              setEditUnitName(unit.name); 
                              setEditUnitSectors(unit.sectors || []); 
                            }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => toggleStatus('units', unit.id, false)}><Trash2 className="w-4 h-4" /></Button>
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
                    {(categories || []).filter(c => !c.active).map(cat => (
                      <div key={cat.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span>{cat.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus('categories', cat.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePermanent('categories', cat.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {(categories || []).filter(c => !c.active).length === 0 && (
                      <div className="text-center p-4 text-xs text-muted-foreground">Lixeira vazia</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-destructive">Unidades Inativas</CardTitle></CardHeader>
                  <CardContent>
                    {(units || []).filter(u => !u.active).map(unit => (
                      <div key={unit.id} className="p-2 border rounded-md mb-2 flex justify-between items-center">
                        <span>{unit.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus('units', unit.id, true)}><RotateCcw className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePermanent('units', unit.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {(units || []).filter(u => !u.active).length === 0 && (
                      <div className="text-center p-4 text-xs text-muted-foreground">Lixeira vazia</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Diálogos de Edição */}
          <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Categoria</Label>
                  <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subcategorias</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nova sub..." 
                      value={editCurrentSub} 
                      onChange={(e) => setEditCurrentSub(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editCurrentSub.trim()) {
                          setEditCatSubs([...editCatSubs, editCurrentSub.trim()]);
                          setEditCurrentSub("");
                        }
                      }}
                    />
                    <Button onClick={() => { if(editCurrentSub.trim()) { setEditCatSubs([...editCatSubs, editCurrentSub.trim()]); setEditCurrentSub(""); } }}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {editCatSubs.map((s, idx) => (
                      <Badge key={`${s}-${idx}`}>
                        {s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setEditCatSubs(editCatSubs.filter((_, i) => i !== idx))} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                <Button onClick={handleUpdateCategory} disabled={!editCatName.trim()}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Unidade</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Unidade</Label>
                  <Input value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Setores</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Novo setor..." 
                      value={editCurrentSector} 
                      onChange={(e) => setEditCurrentSector(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editCurrentSector.trim()) {
                          setEditUnitSectors([...editUnitSectors, editCurrentSector.trim()]);
                          setEditCurrentSector("");
                        }
                      }}
                    />
                    <Button onClick={() => { if(editCurrentSector.trim()) { setEditUnitSectors([...editUnitSectors, editCurrentSector.trim()]); setEditCurrentSector(""); } }}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {editUnitSectors.map((s, idx) => (
                      <Badge key={`${s}-${idx}`} variant="outline">
                        {s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setEditUnitSectors(editUnitSectors.filter((_, i) => i !== idx))} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUnit(null)}>Cancelar</Button>
                <Button onClick={handleUpdateUnit} disabled={!editUnitName.trim()}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </div>
  )
}
