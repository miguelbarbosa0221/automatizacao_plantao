"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useCompany } from "@/context/company-context"; // <--- Importante
import { ConfigService, AppConfig } from "@/lib/config-store";

export default function SettingsPage() {
  const { user } = useUser();
  const { currentCompany } = useCompany(); // <--- Pegando a empresa atual
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os inputs de novos itens
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newItem, setNewItem] = useState("");

  // Carregar dados ao iniciar ou mudar de empresa
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentCompany]); // <--- Recarrega se a empresa mudar

  async function loadData() {
    setIsLoading(true);
    if (user) {
      const data = await ConfigService.loadConfig(user.uid, currentCompany?.id);
      setConfig(data);
    }
    setIsLoading(false);
  }

  // Função genérica para adicionar
  const handleAdd = async (field: keyof AppConfig, value: string, setValue: (s: string) => void) => {
    if (!value.trim() || !user) return;
    
    try {
      // Atualização Otimista (na tela antes do banco)
      const oldConfig = config;
      if (config) {
        setConfig({
          ...config,
          [field]: [...config[field], value]
        });
      }

      await ConfigService.addItem(user.uid, field, value, currentCompany?.id);
      setValue(""); // Limpa o input
      
      toast({ title: "Adicionado com sucesso!" });
    } catch (error) {
      console.error(error);
      if (config) setConfig(config); // Reverte se der erro
      toast({ variant: "destructive", title: "Erro ao salvar." });
    }
  };

  // Função genérica para remover
  const handleRemove = async (field: keyof AppConfig, value: string) => {
    if (!user || !config) return;

    try {
      // Atualização Otimista
      setConfig({
        ...config,
        [field]: config[field].filter(item => item !== value)
      });

      await ConfigService.removeItem(user.uid, field, value, currentCompany?.id);
      
      toast({ title: "Item removido." });
    } catch (error) {
      console.error(error);
      loadData(); // Recarrega se der erro
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">Configurações</h1>
            <span className="text-xs text-muted-foreground">
              {currentCompany ? `Gerenciando: ${currentCompany.name}` : "Gerenciando: Área Pessoal"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Tabs defaultValue="categories" className="space-y-4">
            <TabsList>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="units">Unidades / Setores</TabsTrigger>
              <TabsTrigger value="items">Itens de Inventário</TabsTrigger>
            </TabsList>

            {/* TAB: CATEGORIAS */}
            <TabsContent value="categories">
              <ConfigCard 
                title="Categorias de Chamado"
                description="Defina os tipos de problemas para classificar os chamados."
                items={config?.categories || []}
                inputValue={newCategory}
                onInputChange={setNewCategory}
                onAdd={() => handleAdd('categories', newCategory, setNewCategory)}
                onRemove={(val) => handleRemove('categories', val)}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* TAB: UNIDADES */}
            <TabsContent value="units">
              <ConfigCard 
                title="Unidades e Setores"
                description="Cadastre os locais de atendimento (ex: UTI, Recepção)."
                items={config?.units || []}
                inputValue={newUnit}
                onInputChange={setNewUnit}
                onAdd={() => handleAdd('units', newUnit, setNewUnit)}
                onRemove={(val) => handleRemove('units', val)}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* TAB: ITENS */}
            <TabsContent value="items">
              <ConfigCard 
                title="Itens de Inventário"
                description="Lista de equipamentos comuns para seleção rápida."
                items={config?.items || []}
                inputValue={newItem}
                onInputChange={setNewItem}
                onAdd={() => handleAdd('items', newItem, setNewItem)}
                onRemove={(val) => handleRemove('items', val)}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}

// Sub-componente para evitar repetição de código
function ConfigCard({ title, description, items, inputValue, onInputChange, onAdd, onRemove, isLoading }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="Adicionar novo..." 
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <Button onClick={onAdd} disabled={isLoading}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum item cadastrado.</p>
          ) : (
            items.map((item: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-2 text-sm">
                {item}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 hover:bg-destructive/20 hover:text-destructive rounded-full"
                  onClick={() => onRemove(item)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}