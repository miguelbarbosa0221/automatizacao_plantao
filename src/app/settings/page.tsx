"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Building2, Tags } from "lucide-react"
import { useState, useEffect } from "react"
import { getCategories, getUnits, addCategory, removeCategory, addUnit, removeUnit, Category, Unit } from "@/lib/config-store"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const { toast } = useToast()

  // Estados para os formulários
  const [newCatName, setNewCatName] = useState("")
  const [newCatSubs, setNewCatSubs] = useState("")
  const [newUnitName, setNewUnitName] = useState("")
  const [newUnitSectors, setNewUnitSectors] = useState("")

  useEffect(() => {
    setCategories(getCategories())
    setUnits(getUnits())
  }, [])

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      toast({ title: "Erro", description: "Nome da categoria é obrigatório.", variant: "destructive" });
      return;
    }
    const subs = newCatSubs.split(",").map(s => s.trim()).filter(s => s !== "");
    const updated = addCategory(newCatName, subs);
    setCategories(updated);
    setNewCatName("");
    setNewCatSubs("");
    toast({ title: "Sucesso", description: "Categoria adicionada com sucesso!" });
  }

  const handleDeleteCategory = (id: string) => {
    const updated = removeCategory(id);
    setCategories(updated);
    toast({ title: "Removido", description: "Categoria excluída." });
  }

  const handleAddUnit = () => {
    if (!newUnitName.trim()) {
      toast({ title: "Erro", description: "Nome da unidade é obrigatório.", variant: "destructive" });
      return;
    }
    const sectors = newUnitSectors.split(",").map(s => s.trim()).filter(s => s !== "");
    const updated = addUnit(newUnitName, sectors);
    setUnits(updated);
    setNewUnitName("");
    setNewUnitSectors("");
    toast({ title: "Sucesso", description: "Unidade adicionada com sucesso!" });
  }

  const handleDeleteUnit = (id: string) => {
    const updated = removeUnit(id);
    setUnits(updated);
    toast({ title: "Removido", description: "Unidade excluída." });
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
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="categories" className="gap-2">
                <Tags className="w-4 h-4" /> Categorias
              </TabsTrigger>
              <TabsTrigger value="units" className="gap-2">
                <Building2 className="w-4 h-4" /> Unidades & Setores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestão de Categorias</CardTitle>
                    <CardDescription>Defina as categorias e subcategorias para o refinamento da IA.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {categories.map((cat) => (
                          <div key={cat.id} className="p-4 rounded-lg border bg-card space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{cat.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8"
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cat.subcategories.map((sub, idx) => (
                                <span key={idx} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md border">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Adicionar Nova Categoria</CardTitle>
                    <CardDescription>Crie novas opções para o fluxo de atendimento.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Categoria</Label>
                      <Input 
                        placeholder="Ex: Sistemas Terceiros" 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategorias (separadas por vírgula)</Label>
                      <Input 
                        placeholder="Ex: ERP, Site, Intranet" 
                        value={newCatSubs}
                        onChange={(e) => setNewCatSubs(e.target.value)}
                      />
                    </div>
                    <Button className="w-full gap-2" onClick={handleAddCategory}>
                      <Plus className="w-4 h-4" /> Salvar Categoria
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="units">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Unidades Cadastradas</CardTitle>
                    <CardDescription>Locais físicos de atendimento.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {units.map((unit) => (
                          <div key={unit.id} className="p-4 rounded-lg border bg-card space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{unit.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8"
                                onClick={() => handleDeleteUnit(unit.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {unit.sectors.map((sector, idx) => (
                                <span key={idx} className="text-[10px] bg-accent/10 px-2 py-0.5 rounded-md border border-accent/30">
                                  {sector}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Nova Unidade</CardTitle>
                    <CardDescription>Cadastre novas filiais ou prédios.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Unidade</Label>
                      <Input 
                        placeholder="Ex: Hospital Municipal" 
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Setores (separados por vírgula)</Label>
                      <Input 
                        placeholder="Ex: Almoxarifado, Financeiro, CPD" 
                        value={newUnitSectors}
                        onChange={(e) => setNewUnitSectors(e.target.value)}
                      />
                    </div>
                    <Button className="w-full gap-2" onClick={handleAddUnit}>
                      <Plus className="w-4 h-4" /> Salvar Unidade
                    </Button>
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
