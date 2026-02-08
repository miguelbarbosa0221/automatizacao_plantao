
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, Send, Wand2, Copy, CheckCircle2, MapPin, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function NewDemandPage() {
  const [activeTab, setActiveTab] = useState("structured")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{title: string, description: string, resolution: string} | null>(null)
  const [freeText, setFreeText] = useState("")
  const { toast } = useToast()
  const router = useRouter()
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

  const activeCategories = useMemo(() => (categoriesData || []).filter(c => c.active), [categoriesData]);
  const activeUnits = useMemo(() => (unitsData || []).filter(u => u.active), [unitsData]);

  const [selectedUnitName, setSelectedUnitName] = useState("")
  const [selectedSector, setSelectedSector] = useState("")
  const [selectedCategoryName, setSelectedCategoryName] = useState("")
  const [selectedSubName, setSelectedSubName] = useState("")
  const [selectedItemName, setSelectedItemName] = useState("")
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")

  const currentUnit = useMemo(() => activeUnits.find(u => u.name === selectedUnitName), [activeUnits, selectedUnitName]);
  const currentCategory = useMemo(() => activeCategories.find(c => c.name === selectedCategoryName), [activeCategories, selectedCategoryName]);
  const currentSub = useMemo(() => currentCategory?.subcategories?.find((s: any) => s.name === selectedSubName), [currentCategory, selectedSubName]);

  const handleProcessFreeText = async () => {
    if (!freeText.trim()) {
      toast({ title: "Erro", description: "Por favor, insira o texto da demanda." });
      return;
    }
    setLoading(true);
    try {
      const output = await processFreeTextDemandWithGemini({ freeText });
      setResult(output);
      toast({ title: "Sucesso", description: "Demanda processada com sucesso!" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar demanda." });
    } finally {
      setLoading(false);
    }
  }

  const handleProcessStructured = async () => {
    if (!selectedCategoryName || !subject || !details || !selectedUnitName || !selectedSector) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    try {
      const textToProcess = `
        LOCALIZAÇÃO: Unidade ${selectedUnitName}, Setor ${selectedSector}
        CATEGORIA: ${selectedCategoryName}
        SUBCATEGORIA: ${selectedSubName || 'Geral'}
        ITEM: ${selectedItemName || 'Não especificado'}
        ASSUNTO: ${subject}
        DETALHES DO ATENDIMENTO: ${details}
      `.trim();

      const output = await processFreeTextDemandWithGemini({ freeText: textToProcess });
      setResult(output);
      toast({ title: "Sucesso", description: "Dados estruturados e padronizados." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar demanda estruturada." });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = () => {
    if (!result || !user || !db) return;
    const demandId = Math.random().toString(36).substr(2, 9);
    const demandRef = doc(db, "users", user.uid, "demands", demandId);
    
    const newDemand = {
      ...result,
      id: demandId,
      timestamp: new Date().toISOString(),
      source: activeTab as 'structured' | 'free-text',
      category: activeTab === 'structured' ? selectedCategoryName : 'Geral',
      subcategory: activeTab === 'structured' ? selectedSubName : '',
      item: activeTab === 'structured' ? selectedItemName : ''
    };

    setDocumentNonBlocking(demandRef, newDemand, { merge: true });
    toast({ title: "Salvo!", description: "Demanda registrada com sucesso." });
    router.push("/demands/history");
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Nova Demanda</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="structured">Interface Estruturada</TabsTrigger>
                <TabsTrigger value="free-text">Texto Livre</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structured">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Demanda Estruturada</CardTitle>
                    <CardDescription>Preencha os detalhes para padronização via IA.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-accent/5 rounded-lg border border-accent/20 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase">
                        <MapPin className="w-4 h-4" /> Origem da Demanda
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Select onValueChange={setSelectedUnitName} value={selectedUnitName}>
                            <SelectTrigger><SelectValue placeholder={isUnitLoading ? "Carregando..." : "Selecione a unidade"} /></SelectTrigger>
                            <SelectContent>
                              {activeUnits.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Setor</Label>
                          <Select onValueChange={setSelectedSector} disabled={!selectedUnitName} value={selectedSector}>
                            <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                            <SelectContent>
                              {currentUnit?.sectors?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase">
                        <Tag className="w-4 h-4" /> Classificação Técnica
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <Select onValueChange={(val) => { setSelectedCategoryName(val); setSelectedSubName(""); setSelectedItemName(""); }} value={selectedCategoryName}>
                            <SelectTrigger><SelectValue placeholder={isCatLoading ? "..." : "Principal"} /></SelectTrigger>
                            <SelectContent>
                              {activeCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Subcategoria</Label>
                          <Select onValueChange={(val) => { setSelectedSubName(val); setSelectedItemName(""); }} disabled={!selectedCategoryName} value={selectedSubName}>
                            <SelectTrigger><SelectValue placeholder="Secundária" /></SelectTrigger>
                            <SelectContent>
                              {currentCategory?.subcategories?.map((sub: any) => <SelectItem key={sub.name} value={sub.name}>{sub.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Item (Atividade)</Label>
                          <Select onValueChange={setSelectedItemName} disabled={!selectedSubName} value={selectedItemName}>
                            <SelectTrigger><SelectValue placeholder="Específica" /></SelectTrigger>
                            <SelectContent>
                              {currentSub?.items?.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assunto Breve (Base para o título)</Label>
                      <Input placeholder="Ex: Lentidão no PEP / Troca de Teclado" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>O que foi realizado?</Label>
                      <Textarea placeholder="Descreva o problema e a solução..." className="min-h-[120px]" value={details} onChange={(e) => setDetails(e.target.value)} />
                    </div>

                    <Button className="w-full gap-2 font-medium h-12" onClick={handleProcessStructured} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      Processar e Padronizar com IA
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="free-text">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Demanda via Texto Livre</CardTitle>
                    <CardDescription>Digite a ocorrência como ela foi relatada.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="freeText">Descrição da ocorrência</Label>
                      <Textarea id="freeText" placeholder="Digite aqui o relato do atendimento..." className="min-h-[150px]" value={freeText} onChange={(e) => setFreeText(e.target.value)} />
                    </div>
                    <Button className="w-full gap-2 font-medium h-12" onClick={handleProcessFreeText} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      Processar com Gemini
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-xl bg-accent/5 overflow-hidden">
                  <div className="bg-accent h-2 w-full" />
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Resultado Padronizado</CardTitle>
                      <CardDescription>Dados otimizados pela IA para o Help Desk.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`Título: ${result.title}\n\nDescrição: ${result.description}\n\nResolução: ${result.resolution}`); toast({title: "Copiado"}); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground font-bold">Título</Label><div className="p-3 bg-white rounded-md border text-sm font-medium">{result.title}</div></div>
                    <div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground font-bold">Descrição Técnica</Label><div className="p-3 bg-white rounded-md border text-sm">{result.description}</div></div>
                    <div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground font-bold">Resolução</Label><div className="p-3 bg-white rounded-md border text-sm italic">{result.resolution}</div></div>
                    <div className="flex gap-4 pt-4">
                      <Button className="flex-1 gap-2 h-11" variant="default" onClick={handleSave}><CheckCircle2 className="w-4 h-4" /> Finalizar e Salvar</Button>
                      <Button className="flex-1 gap-2 h-11 bg-secondary text-secondary-foreground" onClick={() => { navigator.clipboard.writeText(`Título: ${result.title}\n\nDescrição: ${result.description}\n\nResolução: ${result.resolution}`); toast({title: "Copiado"}); }}><Send className="w-4 h-4" /> Copiar para Exportação</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}
