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
import { useState } from "react"
import { processFreeTextDemandWithGemini } from "@/ai/flows/process-free-text-demand-with-gemini"
import { Loader2, Send, Wand2, Copy, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addDemand } from "@/lib/demand-store"
import { useRouter } from "next/navigation"

export default function NewDemandPage() {
  const [activeTab, setActiveTab] = useState("structured")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{title: string, description: string, resolution: string} | null>(null)
  const [freeText, setFreeText] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const [category, setCategory] = useState("")
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")

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
      toast({ title: "Erro", description: "Falha ao processar demanda com Gemini." });
    } finally {
      setLoading(false);
    }
  }

  const handleProcessStructured = async () => {
    if (!category || !subject || !details) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    try {
      const textToProcess = `Categoria: ${category}\nAssunto: ${subject}\nDetalhes: ${details}`;
      const output = await processFreeTextDemandWithGemini({ freeText: textToProcess });
      setResult(output);
      toast({ title: "Sucesso", description: "Dados estruturados e padronizados." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar demanda." });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = () => {
    if (!result) return;
    const newDemand = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      source: activeTab as 'structured' | 'free-text',
      category: activeTab === 'structured' ? category : 'Geral'
    };
    addDemand(newDemand);
    toast({ title: "Salvo!", description: "Demanda salva no histórico do plantão." });
    router.push("/");
  }

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Título: ${result.title}\n\nDescrição Técnica:\n${result.description}\n\nResolução:\n${result.resolution}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Conteúdo copiado para a área de transferência." });
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
                    <CardDescription>Preencha os campos para um registro mais organizado antes do processamento.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hardware">Hardware</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                            <SelectItem value="Rede">Rede</SelectItem>
                            <SelectItem value="Acessos">Acessos/Contas</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Assunto Breve</Label>
                        <Input 
                          placeholder="Ex: Impressora travada" 
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Detalhes do Atendimento</Label>
                      <Textarea 
                        placeholder="Descreva o que foi feito e qual era o problema..." 
                        className="min-h-[100px]"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full gap-2 font-medium" 
                      onClick={handleProcessStructured}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Padronizar Demanda
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="free-text">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Demanda via Texto Livre</CardTitle>
                    <CardDescription>Ideal para atendimentos verbais ou rápidos. Digite exatamente o que aconteceu.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="freeText">Descrição da ocorrência</Label>
                      <Textarea 
                        id="freeText" 
                        placeholder="Ex: O usuário João da contabilidade ligou dizendo que a impressora HP do 2º andar está com papel preso e não consegue imprimir nada." 
                        className="min-h-[150px]"
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full gap-2 font-medium" 
                      onClick={handleProcessFreeText}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-4 h-4" />}
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
                      <div className="p-3 bg-white rounded-md border text-sm font-medium">
                        {result.title}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Descrição Técnica</Label>
                      <div className="p-3 bg-white rounded-md border text-sm whitespace-pre-wrap">
                        {result.description}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Resolução</Label>
                      <div className="p-3 bg-white rounded-md border text-sm italic">
                        {result.resolution}
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button className="flex-1 gap-2" variant="default" onClick={handleSave}>
                        <CheckCircle2 className="w-4 h-4" /> Finalizar e Salvar
                      </Button>
                      <Button className="flex-1 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={copyToClipboard}>
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
