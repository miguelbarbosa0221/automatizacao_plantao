"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Building2, RotateCcw } from "lucide-react"; // Adicionei RotateCcw
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/context/company-context";
import { ConfigService, AppConfig } from "@/lib/config-store";

// Configuração Padrão para Reset
const DEFAULT_CONFIG: AppConfig = {
  categories: ["Hardware", "Software", "Rede", "Impressora", "Outros"],
  units: ["UTI", "Emergência", "Recepção", "Centro Cirúrgico", "Administrativo"],
  items: ["Computador", "Monitor", "Teclado", "Mouse", "Impressora", "Estabilizador"]
};

export default function SettingsPage() {
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (currentCompany?.id) {
      loadData();
    }
  }, [currentCompany]);

  async function loadData() {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    console.log("Carregando configurações para empresa:", currentCompany.id);
    try {
      const data = await ConfigService.loadConfig(currentCompany.id);
      console.log("Dados carregados:", data);
      setConfig(data);
    } catch (e) {
      console.error("Erro ao carregar:", e);
      toast({ variant: "destructive", title: "Erro ao carregar dados." });
    }
    setIsLoading(false);
  }

  // Função para adicionar itens
  const handleAdd = async (field: keyof AppConfig, value: string, setValue: (s: string) => void) => {
    if (!value.trim() || !currentCompany?.id) return;
    
    try {
      const currentList = config ? config[field] : [];
      const updatedConfig = { ...config, [field]: [...currentList, value] } as AppConfig;
      
      setConfig(updatedConfig); // Otimista
      await ConfigService.addItem(currentCompany.id, field, value);
      setValue(""); 
      toast({ title: "Item adicionado!" });
    } catch (error) {
      console.error(error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao salvar." });
    }
  };

  // Função para remover itens
  const handleRemove = async (field: keyof AppConfig, value: string) => {
    if (!currentCompany?.id || !config) return;

    try {
      const updatedConfig = { 
        ...config, 
        [field]: config[field].filter(item => item !== value) 
      } as AppConfig;

      setConfig(updatedConfig); // Otimista
      await ConfigService.removeItem(currentCompany.id, field, value);
      toast({ title: "Item removido." });
    } catch (error) {
      console.error(error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  // Função de Reset de Emergência
  const handleResetDefaults = async () => {
    if (!currentCompany?.id) return;
    if (!confirm("Isso vai apagar as configurações atuais desta empresa e restaurar o padrão. Tem certeza?")) return;

    try {
      setIsLoading(true);
      // Aqui vamos forçar a re-criação de cada item um por um ou salvar o objeto inteiro se o seu service permitir.
      // Como o service usa arrayUnion, vamos fazer um "hack" rápido: salvar itens padrão um a um.
      // Melhor ainda: Vamos instruir o usuário a usar o ConfigService corretamente se ele tivesse um método 'saveAll', mas como não tem, vamos simular recarregando o padrão.
      
      // Na verdade, o loadConfig JÁ FAZ ISSO se o doc não existir.
      // Se o doc existe e está vazio, vamos tentar popular manualmente.
      
      for (const cat of DEFAULT_CONFIG.categories) await ConfigService.addItem(currentCompany.id, 'categories', cat);
      for (const unit of DEFAULT_CONFIG.units) await ConfigService.addItem(currentCompany.id, 'units', unit);
      for (const item of DEFAULT_CONFIG.items) await ConfigService.addItem(currentCompany.id, 'items', item);
      
      await loadData();
      toast({ title: "Padrões restaurados com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao restaurar padrões." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentCompany) {
    return (
        <div className="flex h-screen bg-background items-center justify-center flex-col gap-4">
            <p className="text-muted-foreground animate-pulse">Carregando dados da empresa...</p>
            <p className="text-xs text-muted-foreground">Se demorar, verifique se você selecionou uma empresa.</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-bold">Configurações</h1>
          </div>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleResetDefaults}>
               <RotateCcw className="w-4 h-4 mr-2" /> Restaurar Padrões
             </Button>
             <div className="flex items-center gap-2 text-sm px-3 py-1 bg-muted rounded-md">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-medium">{currentCompany.name}</span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Tabs defaultValue="categories" className="space-y-4">
            <TabsList>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="units">Unidades / Setores</TabsTrigger>
              <TabsTrigger value="items">Itens de Inventário</TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
              <ConfigCard 
                title="Categorias de Chamado"
                description={`Tipos de problemas para ${currentCompany.name}.`}
                items={config?.categories || []}
                inputValue={newCategory}
                onInputChange={setNewCategory}
                onAdd={() => handleAdd('categories', newCategory, setNewCategory)}
                onRemove={(val) => handleRemove('categories', val)}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="units">
              <ConfigCard 
                title="Unidades e Setores"
                description={`Locais da ${currentCompany.name}.`}
                items={config?.units || []}
                inputValue={newUnit}
                onInputChange={setNewUnit}
                onAdd={() => handleAdd('units', newUnit, setNewUnit)}
                onRemove={(val) => handleRemove('units', val)}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="items">
              <ConfigCard 
                title="Itens de Inventário"
                description={`Equipamentos da ${currentCompany.name}.`}
                items={config?.items || []}
                inputValue={newItem}
                onInputChange={newItem} // Correção aqui: estava setNewItem
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
            onChange={(e) => onInputChange(e.target.value)} // Garante que recebe o evento
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <Button onClick={onAdd} disabled={isLoading}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !items || items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum item cadastrado. Use o botão "Restaurar Padrões" se necessário.</p>
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