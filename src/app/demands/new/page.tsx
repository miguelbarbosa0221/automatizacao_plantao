
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, Wand2, Copy, CheckCircle2, MapPin, Tag, Lightbulb, History, LayoutGrid, AlignLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, where, limit } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

// Helper para normalizar subcategorias legadas (strings) para objetos
const normalizeSubs = (subs: any[]): {name: string, items: string[]}[] => {
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, items: [] };
    return { name: s?.name || 'Sem nome', items: s?.items || [] };
  });
};

export default function NewDemandPage() {
  const [activeTab, setActiveTab] = useState("structured")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{title: string, description: string, resolution: string} | null>(null)
  const [freeText, setFreeText] = useState("")
  const { toast } = useToast()
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()

  // Queries globais
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
  
  const currentSubcategories = useMemo(() => normalizeSubs(currentCategory?.subcategories), [currentCategory]);
  const currentSub = useMemo(() => currentSubcategories.find(s => s.name === selectedSubName), [currentSubcategories, selectedSubName]);

  // Sugestões inteligentes baseadas no histórico privado do usuário
  const suggestionsQuery = useMemoFirebase(() => {
    if (!db || !user || !selectedCategoryName) return null;
    return query(
      collection(db, "users", user.uid, "demands"),
      where("category", "==", selectedCategoryName),
      limit(10)
    );
  }, [db, user, selectedCategoryName]);

  const { data: historicalDemands } = useCollection(suggestionsQuery);

  const uniqueSuggestions = useMemo(() => {
    if (!historicalDemands) return [];
    const resolutions = historicalDemands.map(d => d.resolution);
    return Array.from(new Set(resolutions)).slice(0, 3);
  }, [historicalDemands]);

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
    if (!selectedCategoryName || !details || !selectedUnitName || !selectedSector) {
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
        INFORMAÇÃO LIVRE: ${subject || 'Relato estruturado'}
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
        <main className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="structured" className="gap-2"><LayoutGrid className="w-4 h-4" /> Interface Estruturada</TabsTrigger>
                <TabsTrigger value="free-text" className="gap-2"><AlignLeft className="w-4 h-4" /> Texto Livre</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structured">
                <Card className="border-none shadow-lg overflow-hidden">
                  <CardHeader className="bg-primary/5 pb-8">
                    <CardTitle>Fluxo de Registro Linear</CardTitle>
                    <CardDescription>Mapeie a demanda através do grid dinâmico para padronização imediata.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 mt-[-20px] px-6">
                    {/* Grid Dinâmico (Estilo Planilha) */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white rounded-xl border shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 px-1">
                          <MapPin className="w-3 h-3" /> Unidade
                        </Label>
                        <Select onValueChange={setSelectedUnitName} value={selectedUnitName}>
                          <SelectTrigger className="h-10 bg-muted/20 border-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder={isUnitLoading ? "..." : "Local"} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeUnits.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 px-1">
                          Setor
                        </Label>
                        <Select onValueChange={setSelectedSector} disabled={!selectedUnitName} value={selectedSector}>
                          <SelectTrigger className="h-10 bg-muted/20 border-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Área" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentUnit?.sectors?.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 px-1">
                          <Tag className="w-3 h-3" /> Categoria
                        </Label>
                        <Select onValueChange={(val) => { setSelectedCategoryName(val); setSelectedSubName(""); setSelectedItemName(""); }} value={selectedCategoryName}>
                          <SelectTrigger className="h-10 bg-muted/20 border-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder={isCatLoading ? "..." : "Grupo"} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 px-1">
                          Subcategoria
                        </Label>
                        <Select onValueChange={(val) => { setSelectedSubName(val); setSelectedItemName(""); }} disabled={!selectedCategoryName} value={selectedSubName}>
                          <SelectTrigger className="h-10 bg-muted/20 border-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentSubcategories.map(sub => <SelectItem key={sub.name} value={sub.name}>{sub.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 px-1">
                          Atividade
                        </Label>
                        <Select onValueChange={setSelectedItemName} disabled={!selectedSubName} value={selectedItemName}>
                          <SelectTrigger className="h-10 bg-muted/20 border-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Item" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentSub?.items?.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                          <History className="w-4 h-4" /> Informação Livre
                          <Badge variant="outline" className="text-[9px] font-normal uppercase">Contexto</Badge>
                        </Label>
                        <Input 
                          placeholder="Relato rápido do que o usuário disse..." 
                          className="h-12 border-primary/20 focus:border-primary"
                          value={subject} 
                          onChange={(e) => setSubject(e.target.value)} 
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-muted-foreground uppercase">Resolução Técnica</Label>
                          {uniqueSuggestions.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase animate-pulse">
                              <Lightbulb className="w-3 h-3" /> Sugestões Inteligentes
                            </div>
                          )}
                        </div>
                        
                        {uniqueSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {uniqueSuggestions.map((sug, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] h-6 bg-primary/5 border-primary/10 hover:bg-primary/10 hover:border-primary text-primary-foreground/80"
                                onClick={() => setDetails(sug)}
                              >
                                {sug.slice(0, 30)}...
                              </Button>
                            ))}
                          </div>
                        )}

                        <Textarea 
                          placeholder="Descreva a solução aplicada..." 
                          className="min-h-[100px] border-primary/20 focus:border-primary" 
                          value={details} 
                          onChange={(e) => setDetails(e.target.value)} 
                        />
                      </div>
                    </div>

                    <Button className="w-full gap-2 font-medium h-14 text-lg shadow-xl shadow-primary/20" onClick={handleProcessStructured} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-6 h-6" />}
                      Processar e Padronizar Chamado
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="free-text">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Demanda via Texto Livre</CardTitle>
                    <CardDescription>Digite a ocorrência como ela foi relatada para extração automática.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="freeText">Relato do Atendimento</Label>
                      <Textarea id="freeText" placeholder="Ex: Usuário do setor X informou que o sistema Y não abre..." className="min-h-[200px]" value={freeText} onChange={(e) => setFreeText(e.target.value)} />
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
                <Card className="border-none shadow-2xl bg-accent/5 overflow-hidden">
                  <div className="bg-accent h-2 w-full" />
                  <CardHeader>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Extração Finalizada</span>
                    </div>
                    <CardTitle className="text-xl">Otimizado para o Help Desk</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Título do Chamado</Label>
                        <div className="p-3 bg-white rounded-md border text-sm font-medium border-primary/10">{result.title}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Relato (Usuário)</Label>
                        <div className="p-3 bg-white rounded-md border text-sm border-primary/10">{result.description}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">Resolução Técnica</Label>
                      <div className="p-3 bg-white rounded-md border text-sm italic border-primary/10">{result.resolution}</div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button className="flex-1 gap-2 h-12 shadow-lg" variant="default" onClick={handleSave}><CheckCircle2 className="w-4 h-4" /> Finalizar Registro</Button>
                      <Button className="flex-1 gap-2 h-12 bg-secondary text-secondary-foreground" onClick={() => { navigator.clipboard.writeText(`Título: ${result.title}\n\nDescrição: ${result.description}\n\nResolução: ${result.resolution}`); toast({title: "Copiado"}); }}><Copy className="w-4 h-4" /> Copiar Dados</Button>
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
