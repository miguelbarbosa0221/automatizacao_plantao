"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Building2, Tags, RotateCcw, X, Pencil, Save } from "lucide-react"
import { useState, useEffect } from "react"
import { 
  getCategories, 
  getUnits, 
  addCategory, 
  updateCategory,
  toggleCategoryStatus, 
  deleteCategoryPermanently,
  addUnit, 
  updateUnit,
  toggleUnitStatus, 
  deleteUnitPermanently,
  Category, 
  Unit 
} from "@/lib/config-store"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const { toast } = useToast()

  // Estados para nova Categoria
  const [newCatName, setNewCatName] = useState("")
  const [catSubsList, setCatSubsList] = useState<string[]>([])
  const [currentSub, setCurrentSub] = useState("")

  // Estados para nova Unidade
  const [newUnitName, setNewUnitName] = useState("")
  const [unitSectorsList, setUnitSectorsList] = useState<string[]>([])
  const [currentSector, setCurrentSector] = useState("")

  // Estados para Edição
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<string[]>([])
  const [editCurrentSub, setEditCurrentSub] = useState("")

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editUnitName, setEditUnitName] = useState("")
  const [editUnitSectors, setEditUnitSectors] = useState<string[]>([])
  const [editCurrentSector, setEditCurrentSector] = useState("")

  useEffect(() => {
    setCategories(getCategories(true))
    setUnits(getUnits(true))
  }, [])

  // CRUD Categoria
  const addSubToList = () => {
    if (currentSub.trim() && !catSubsList.includes(currentSub.trim())) {
      setCatSubsList([...catSubsList, currentSub.trim()])
      setCurrentSub("")
    }
  }

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      toast({ title: "Erro", description: "Nome da categoria é obrigatório.", variant: "destructive" });
      return;
    }
    const updated = addCategory(newCatName, catSubsList);
    setCategories(updated);
    setNewCatName("");
    setCatSubsList([]);
    toast({ title: "Sucesso", description: "Categoria adicionada!" });
  }

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatSubs([...cat.subcategories]);
    setEditCurrentSub("");
  }

  const handleUpdateCategory = () => {
    if (!editingCategory || !editCatName.trim()) return;
    const updated = updateCategory(editingCategory.id, editCatName, editCatSubs);
    setCategories(updated);
    setEditingCategory(null);
    toast({ title: "Sucesso", description: "Categoria atualizada!" });
  }

  // CRUD Unidade
  const addSectorToList = () => {
    if (currentSector.trim() && !unitSectorsList.includes(currentSector.trim())) {
      setUnitSectorsList([...unitSectorsList, currentSector.trim()])
      setCurrentSector("")
    }
  }

  const handleAddUnit = () => {
    if (!newUnitName.trim()) {
      toast({ title: "Erro", description: "Nome da unidade é obrigatório.", variant: "destructive" });
      return;
    }
    const updated = addUnit(newUnitName, unitSectorsList);
    setUnits(updated);
    setNewUnitName("");
    setUnitSectorsList([]);
    toast({ title: "Sucesso", description: "Unidade adicionada!" });
  }

  const startEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditUnitName(unit.name);
    setEditUnitSectors([...unit.sectors]);
    setEditCurrentSector("");
  }

  const handleUpdateUnit = () => {
    if (!editingUnit || !editUnitName.trim()) return;
    const updated = updateUnit(editingUnit.id, editUnitName, editUnitSectors);
    setUnits(updated);
    setEditingUnit(null);
    toast({ title: "Sucesso", description: "Unidade atualizada!" });
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Configurações Administrativas</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="categories" className="gap-2">
                <Tags className="w-4 h-4" /> Categorias
              </TabsTrigger>
              <TabsTrigger value="units" className="gap-2">
                <Building2 className="w-4 h-4" /> Unidades
              </TabsTrigger>
              <TabsTrigger value="trash" className="gap-2">
                <Trash2 className="w-4 h-4" /> Lixeira
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Categoria</CardTitle>
                    <CardDescription>Estruture as opções do plantão.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Categoria</Label>
                      <Input placeholder="Ex: Hardware" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategorias</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Adicionar sub..." 
                          value={currentSub} 
                          onChange={(e) => setCurrentSub(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSubToList()}
                        />
                        <Button variant="secondary" onClick={addSubToList}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {catSubsList.map(s => (
                          <span key={s} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs flex items-center gap-1">
                            {s} <X className="w-3 h-3 cursor-pointer" onClick={() => setCatSubsList(catSubsList.filter(i => i !== s))} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full gap-2" onClick={handleAddCategory}>
                      <Plus className="w-4 h-4" /> Salvar Categoria
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Categorias Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {categories.filter(c => c.active).map(cat => (
                          <div key={cat.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                            <div>
                              <div className="font-bold">{cat.name}</div>
                              <div className="text-[10px] text-muted-foreground">{cat.subcategories.join(", ")}</div>
                            </div>
                            <div className="flex gap-1">
                              <Dialog open={editingCategory?.id === cat.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => startEditCategory(cat)}><Pencil className="w-4 h-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Editar Categoria</DialogTitle>
                                    <DialogDescription>Atualize o nome e gerencie subcategorias.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Nome</Label>
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
                                        <Button variant="secondary" onClick={() => {
                                          if (editCurrentSub.trim()) {
                                            setEditCatSubs([...editCatSubs, editCurrentSub.trim()]);
                                            setEditCurrentSub("");
                                          }
                                        }}><Plus className="w-4 h-4" /></Button>
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {editCatSubs.map(s => (
                                          <span key={s} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                            {s} <X className="w-3 h-3 cursor-pointer" onClick={() => setEditCatSubs(editCatSubs.filter(i => i !== s))} />
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                                    <Button onClick={handleUpdateCategory} className="gap-2"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Desativação?</AlertDialogTitle>
                                    <AlertDialogDescription>A categoria "{cat.name}" será movida para a lixeira.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setCategories(toggleCategoryStatus(cat.id, false))}>Desativar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="units" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Unidade</CardTitle>
                    <CardDescription>Cadastre locais e seus respectivos setores.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Unidade</Label>
                      <Input placeholder="Ex: Hospital Sul" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Setores</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Adicionar setor..." 
                          value={currentSector} 
                          onChange={(e) => setCurrentSector(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSectorToList()}
                        />
                        <Button variant="secondary" onClick={addSectorToList}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {unitSectorsList.map(s => (
                          <span key={s} className="bg-accent/10 text-accent-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                            {s} <X className="w-3 h-3 cursor-pointer" onClick={() => setUnitSectorsList(unitSectorsList.filter(i => i !== s))} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full gap-2" onClick={handleAddUnit}>
                      <Plus className="w-4 h-4" /> Salvar Unidade
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Unidades Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {units.filter(u => u.active).map(unit => (
                          <div key={unit.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                            <div>
                              <div className="font-bold">{unit.name}</div>
                              <div className="text-[10px] text-muted-foreground">{unit.sectors.join(", ")}</div>
                            </div>
                            <div className="flex gap-1">
                              <Dialog open={editingUnit?.id === unit.id} onOpenChange={(open) => !open && setEditingUnit(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => startEditUnit(unit)}><Pencil className="w-4 h-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Editar Unidade</DialogTitle>
                                    <DialogDescription>Atualize o nome e gerencie setores.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Nome</Label>
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
                                        <Button variant="secondary" onClick={() => {
                                          if (editCurrentSector.trim()) {
                                            setEditUnitSectors([...editUnitSectors, editCurrentSector.trim()]);
                                            setEditCurrentSector("");
                                          }
                                        }}><Plus className="w-4 h-4" /></Button>
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {editUnitSectors.map(s => (
                                          <span key={s} className="bg-accent/10 text-accent-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                            {s} <X className="w-3 h-3 cursor-pointer" onClick={() => setEditUnitSectors(editUnitSectors.filter(i => i !== s))} />
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingUnit(null)}>Cancelar</Button>
                                    <Button onClick={handleUpdateUnit} className="gap-2"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Desativação?</AlertDialogTitle>
                                    <AlertDialogDescription>A unidade "{unit.name}" será movida para a lixeira.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setUnits(toggleUnitStatus(unit.id, false))}>Desativar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trash">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Tags className="w-5 h-5" /> Categorias Inativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categories.filter(c => !c.active).map(cat => (
                        <div key={cat.id} className="p-3 border rounded-md bg-muted/20 flex justify-between items-center">
                          <span className="font-medium">{cat.name}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setCategories(toggleCategoryStatus(cat.id, true))}>
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCategories(deleteCategoryPermanently(cat.id))}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {categories.filter(c => !c.active).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Lixeira vazia.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Unidades Inativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {units.filter(u => !u.active).map(unit => (
                        <div key={unit.id} className="p-3 border rounded-md bg-muted/20 flex justify-between items-center">
                          <span className="font-medium">{unit.name}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setUnits(toggleUnitStatus(unit.id, true))}>
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setUnits(deleteUnitPermanently(unit.id))}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {units.filter(u => !u.active).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Lixeira vazia.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  )
}
