"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Building2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/context/company-context";
import { ConfigService, AppConfig } from "@/lib/config-store";

// Configuração Padrão para Reset e Fallback Visual
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

  // Log para depuração: Verifique o console do navegador (F12)
  useEffect(() => {
    console.log("Estado atual da configuração:", config);
  }, [config]);

  async function loadData() {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    try {
      console.log("Carregando configurações...");
      const data = await ConfigService.loadConfig(currentCompany.id);
      
      // GARANTIA EXTRA: Se vier vazio, forçamos o default visualmente também
      if (!data || (!data.categories?.length && !data.units?.length)) {
          console.warn("Dados vieram vazios, usando default visual.");
          setConfig(DEFAULT_CONFIG);
      } else {
          setConfig(data);
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
      toast({ variant: "destructive", title: "Erro ao carregar dados." });
    } finally {
      setIsLoading(false);
    }
  }

  const handleAdd = async (field: keyof AppConfig, value: string, setValue: (s: string) => void) => {
    if (!value.trim() || !currentCompany?.id) return;
    
    try {
      // Proteção contra config null
      const safeConfig = config || DEFAULT_CONFIG;
      const currentList = safeConfig[field] || [];
      
      const updatedConfig = { ...safeConfig, [field]: [...currentList, value] } as AppConfig;
      
      setConfig(updatedConfig); // Atualização Otimista
      await ConfigService.addItem(currentCompany.id, field, value);
      setValue(""); 
      toast({ title: "Item adicionado!" });
    } catch (error) {
      console.error(error);
      loadData(); // Reverte em caso de erro
      toast({ variant: "destructive", title: "Erro ao salvar." });
    }
  };

  const handleRemove = async (field: keyof AppConfig, value: string) => {
    if (!currentCompany?.id || !config) return;

    try {
      const updatedConfig = { 
        ...config, 
        [field]: config[field].filter(item => item !== value) 
      } as AppConfig;

      setConfig(updatedConfig); // Atualização Otimista
      await ConfigService.removeItem(currentCompany.id, field, value);
      toast({ title: "Item removido." });
    } catch (error) {
      console.error(error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  const handleResetDefaults = async () => {
    if (!currentCompany?.id) return;
    if (!confirm("Isso vai restaurar as categorias padrão. Tem certeza?")) return;

    try {
      setIsLoading(true);
      // Força visual imediata
      setConfig(DEFAULT_CONFIG);
      
      // Tenta salvar no banco item a item (já que é arrayUnion)
      // Nota: Idealmente seu ConfigService teria um 'saveAll' ou 'reset', mas isso resolve por hora
      for (const cat of DEFAULT_CONFIG.categories) await ConfigService.addItem(currentCompany.id, 'categories', cat);
      for (const unit of DEFAULT_CONFIG.units) await ConfigService.addItem(currentCompany.id, 'units', unit);
      for (const item of DEFAULT_CONFIG.items) await ConfigService.addItem(currentCompany.id, 'items', item);
      
      toast({ title: "Padrões restaurados!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao restaurar." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentCompany) {
    return (
        <div className="flex h-screen bg-background items-center justify-center flex-col gap-4">
            <p className="text-muted-foreground animate-pulse">Carregando dados da empresa...</p>
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
                onRemove={(val: string) => handleRemove('categories', val)}
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
                onRemove={(val: string) => handleRemove('units', val)}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="items">
              <ConfigCard 
                title="Itens de Inventário"
                description={`Equipamentos da ${currentCompany.name}.`}
                items={config?.items || []}
                inputValue={newItem}
                onInputChange={setNewItem} 
                onAdd={() => handleAdd('items', newItem, setNewItem)}
                onRemove={(val: string) => handleRemove('items', val)}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}

// Componente Auxiliar
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
          ) : !items || items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
                Nenhum item encontrado. Tente clicar em "Restaurar Padrões".
            </p>
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