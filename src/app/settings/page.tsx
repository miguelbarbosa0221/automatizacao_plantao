"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/context/company-context";
import { ConfigService, AppConfig } from "@/lib/config-store";

export default function SettingsPage() {
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os inputs
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newItem, setNewItem] = useState("");

  // Monitora a empresa atual
  useEffect(() => {
    if (currentCompany?.id) {
      loadData();
    }
  }, [currentCompany]);

  async function loadData() {
    if (!currentCompany?.id) return;
    
    setIsLoading(true);
    const data = await ConfigService.loadConfig(currentCompany.id);
    setConfig(data);
    setIsLoading(false);
  }

  const handleAdd = async (field: keyof AppConfig, value: string, setValue: (s: string) => void) => {
    if (!value.trim() || !currentCompany?.id) return;
    
    try {
      // Atualização Otimista (feedback imediato na tela)
      if (config) {
        setConfig({
          ...config,
          [field]: [...config[field], value]
        });
      }

      await ConfigService.addItem(currentCompany.id, field, value);
      setValue(""); 
      toast({ title: "Item adicionado com sucesso!" });
    } catch (error) {
      console.error(error);
      loadData(); // Reverte se der erro
      toast({ variant: "destructive", title: "Erro ao salvar." });
    }
  };

  const handleRemove = async (field: keyof AppConfig, value: string) => {
    if (!currentCompany?.id || !config) return;

    try {
      // Atualização Otimista
      setConfig({
        ...config,
        [field]: config[field].filter(item => item !== value)
      });

      await ConfigService.removeItem(currentCompany.id, field, value);
      toast({ title: "Item removido." });
    } catch (error) {
      console.error(error);
      loadData();
      toast({ variant: "destructive", title: "Erro ao remover." });
    }
  };

  // Se não carregou a empresa ainda (delay do contexto), mostra loading simples
  if (!currentCompany) {
    return (
        <div className="flex h-screen bg-background items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Carregando dados da empresa...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">Configurações</h1>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
               <Building2 className="w-3 h-3" /> Gerenciando: {currentCompany.name}
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

            <TabsContent value="categories">
              <ConfigCard 
                title="Categorias de Chamado"
                description={`Tipos de problemas disponíveis para a ${currentCompany.name}.`}
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
                description={`Locais de atendimento cadastrados na ${currentCompany.name}.`}
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
                description={`Equipamentos padrão para seleção rápida na ${currentCompany.name}.`}
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

// Componente visual reutilizável
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
            <p className="text-sm text-muted-foreground italic">Nenhum item cadastrado nesta empresa.</p>
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