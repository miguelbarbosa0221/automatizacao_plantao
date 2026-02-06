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
import { getCategories, getUnits, Category, Unit } from "@/lib/config-store"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const { toast } = useToast()

  useEffect(() => {
    setCategories(getCategories())
    setUnits(getUnits())
  }, [])

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
                              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cat.subcategories.map((sub, idx) => (
                                <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded-md">
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
                      <Input placeholder="Ex: Sistemas Terceiros" />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategorias (separadas por vírgula)</Label>
                      <Input placeholder="Ex: ERP, Site, Intranet" />
                    </div>
                    <Button className="w-full gap-2">
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
                              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {unit.sectors.map((sector, idx) => (
                                <span key={idx} className="text-xs bg-accent/20 px-2 py-1 rounded-md border border-accent">
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
                      <Input placeholder="Ex: Hospital Municipal" />
                    </div>
                    <div className="space-y-2">
                      <Label>Setores (separados por vírgula)</Label>
                      <Input placeholder="Ex: Almoxarifado, Financeiro, CPD" />
                    </div>
                    <Button className="w-full gap-2">
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
