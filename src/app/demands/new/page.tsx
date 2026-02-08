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
import { Loader2, Send, Wand2, Copy, CheckCircle2, MapPin } from "lucide-react"
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

  // Queries memorizadas para evitar loops e exceções de cliente
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

  // Estado do formulário
  const [selectedUnitName, setSelectedUnitName] = useState("")
  const [selectedSector, setSelectedSector] = useState("")
  const [selectedCategoryName, setSelectedCategoryName] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")

  const currentUnit = useMemo(() => activeUnits.find(u => u.name === selectedUnitName), [activeUnits, selectedUnitName]);
  const currentCategory = useMemo(() => activeCategories.find(c => c.name === selectedCategoryName), [activeCategories, selectedCategoryName]);

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
      // Incluindo explicitamente o ASSUNTO e LOCALIZAÇÃO para a IA processar corretamente
      const textToProcess = `
        LOCALIZAÇÃO: Unidade ${selectedUnitName}, Setor ${selectedSector}
        CATEGORIA: ${selectedCategoryName}
        SUBCATEGORIA: ${subcategory || 'Geral'}
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
      category: activeTab === 'structured' ? selectedCategoryName : 'Geral'
    };

    setDocumentNonBlocking(demandRef, newDemand, { merge: true });
    toast({ title: "Salvo!", description: "Demanda registrada com sucesso." });
    router.push("/demands/history");
  }

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Título: ${result.title}\n\nDescrição Técnica:\n${result.description}\n\nResolução:\n${result.resolution}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Conteúdo pronto para o Help Desk." });
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
                            <SelectTrigger>
                              <SelectValue placeholder={isUnitLoading ? "Carregando..." : "Selecione a unidade"} />
                            </SelectTrigger>
                            <SelectContent>
                              {activeUnits.map(u => (
                                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Setor</Label>
                          <Select onValueChange={setSelectedSector} disabled={!selectedUnitName} value={selectedSector}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentUnit?.sectors?.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select onValueChange={setSelectedCategoryName} value={selectedCategoryName}>
                          <SelectTrigger>
                            <SelectValue placeholder={isCatLoading ? "Carregando..." : "Selecione uma categoria"} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subcategoria</Label>
                        <Select onValueChange={setSubcategory} disabled={!selectedCategoryName} value={subcategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Opcional" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentCategory?.subcategories?.map(sub => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assunto Breve (Será usado para o título)</Label>
                      <Input 
                        placeholder="Ex: Lentidão no sistema / Troca de mouse" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>O que foi realizado?</Label>
                      <Textarea 
                        placeholder="Descreva o problema e a solução detalhadamente..." 
                        className="min-h-[120px]"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                      />
                    </div>

                    <Button 
                      className="w-full gap-2 font-medium h-12" 
                      onClick={handleProcessStructured}
                      disabled={loading}
                    >
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
                      <Textarea 
                        id="freeText" 
                        placeholder="Ex: O usuário João disse que a impressora do 2º andar parou e eu tive que reiniciar o spooler..." 
                        className="min-h-[150px]"
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full gap-2 font-medium h-12" 
                      onClick={handleProcessFreeText}
                      disabled={loading}
                    >
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
                      <CardTitle className="text-xl">Resultado Processado</CardTitle>
                      <CardDescription>Dados prontos para exportação ao Help Desk.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Título do Chamado</Label>
                      <div className="p-3 bg-white rounded-md border text-sm font-medium">{result.title}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Descrição Técnica</Label>
                      <div className="p-3 bg-white rounded-md border text-sm whitespace-pre-wrap">{result.description}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Resolução</Label>
                      <div className="p-3 bg-white rounded-md border text-sm italic">{result.resolution}</div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button className="flex-1 gap-2 h-11" variant="default" onClick={handleSave}>
                        <CheckCircle2 className="w-4 h-4" /> Finalizar e Salvar
                      </Button>
                      <Button className="flex-1 gap-2 h-11 bg-secondary text-secondary-foreground" onClick={copyToClipboard}>
                        <Send className="w-4 h-4" /> Exportar Help Desk
                      </Button>
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
