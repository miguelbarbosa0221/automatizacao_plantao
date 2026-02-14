"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Building2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

interface AppConfig {
  categories: string[];
  units: string[];
  items: string[];
}

const DEFAULT_CONFIG: AppConfig = {
  categories: ["Hardware", "Software", "Rede", "Impressora", "Outros"],
  units: ["UTI", "Emergência", "Recepção", "Centro Cirúrgico", "Administrativo"],
  items: ["Computador", "Monitor", "Teclado", "Mouse", "Impressora", "Estabilizador"]
};

export default function SettingsPage() {
  const { activeCompanyId, profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newItem, setNewItem] = useState("");

  const currentCompany = profile?.companies?.find((c: any) => c.id === activeCompanyId);

  useEffect(() => {
    if (activeCompanyId && db) {
      loadData();
    }
  }, [activeCompanyId, db]);

  async function loadData() {
    if (!activeCompanyId || !db) return;
    setIsLoading(true);
    try {
      // Carregar categorias
      const categoriesRef = collection(db, "companies", activeCompanyId, "categories");
      const categoriesSnap = await getDocs(categoriesRef);
      const categories = categoriesSnap.docs.map(d => d.data().name as string);

      // Carregar unidades
      const unitsRef = collection(db, "companies", activeCompanyId, "units");
      const unitsSnap = await getDocs(unitsRef);
      const units = unitsSnap.docs.map(d => d.data().name as string);

      // Por enquanto, items virá do default
      const items = DEFAULT_CONFIG.items;

      setConfig({ categories, units, items });
      
      if (categories.length === 0 && units.length === 0) {
        toast({ 
          title: "Configurações vazias", 
          description: "Use 'Restaurar Padrões' para popular os dados iniciais.",
          variant: "default"
        });
      }
    } catch (e: any) {
      console.error("Erro ao carregar:", e);
      toast({ 
        variant: "destructive", 
        title: "Erro ao carregar dados",
        description: e.message
      });
      setConfig(DEFAULT_CONFIG);
    }
    setIsLoading(false);
  }

  const handleAdd = async (field: keyof AppConfig, value: string, setValue: (s: string) => void) => {
    if (!value.trim() || !activeCompanyId || !db) return;
    
    try {
      if (field === "categories") {
        const catId = `cat-${Date.now()}`;
        await setDoc(doc(db, "companies", activeCompanyId, "categories", catId), {
          id: catId,
          name: value,
          active: true,
          subcategories: []
        });
      } else if (field === "units") {
        const unitId = `unit-${Date.now()}`;
        await setDoc(doc(db, "companies", activeCompanyId, "units", unitId), {
          id: unitId,
          name: value,
          active: true,
          sectors: []
        });
      }
      
      setValue("");
      await loadData();
      toast({ title: "Item adicionado!" });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao salvar.", description: error.message });
    }
  };

  const handleRemove = async (field: keyof AppConfig, value: string) => {
    if (!activeCompanyId || !db) return;

    try {
      if (field === "categories") {
        const categoriesRef = collection(db, "companies", activeCompanyId, "categories");
        const snap = await getDocs(categoriesRef);
        const docToDelete = snap.docs.find(d => d.data().name === value);
        if (docToDelete) {
          await deleteDoc(doc(db, "companies", activeCompanyId, "categories", docToDelete.id));
        }
      } else if (field === "units") {
        const unitsRef = collection(db, "companies", activeCompanyId, "units");
        const snap = await getDocs(unitsRef);
        const docToDelete = snap.docs.find(d => d.data().name === value);
        if (docToDelete) {
          await deleteDoc(doc(db, "companies", activeCompanyId, "units", docToDelete.id));
        }
      }

      await loadData();
      toast({ title: "Item removido." });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao remover.", description: error.message });
    }
  };

  const handleResetDefaults = async () => {
    if (!activeCompanyId || !db) return;
    if (!confirm("Isso vai restaurar as configurações padrão. Tem certeza?")) return;

    try {
      setIsLoading(true);
      
      // Criar categorias padrão
      for (const cat of DEFAULT_CONFIG.categories) {
        const catId = `cat-${cat.toLowerCase().replace(/\s/g, '-')}`;
        await setDoc(doc(db, "companies", activeCompanyId, "categories", catId), {
          id: catId,
          name: cat,
          active: true,
          subcategories: []
        });
      }
      
      // Criar unidades padrão
      for (const unit of DEFAULT_CONFIG.units) {
        const unitId = `unit-${unit.toLowerCase().replace(/\s/g, '-')}`;
        await setDoc(doc(db, "companies", activeCompanyId, "units", unitId), {
          id: unitId,
          name: unit,
          active: true,
          sectors: []
        });
      }
      
      await loadData();
      toast({ title: "Padrões restaurados com sucesso!" });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao restaurar padrões.", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentCompany) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background">
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Carregando empresa...</p>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">Configurações do Catálogo</h1>
            </div>
            
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={handleResetDefaults} disabled={isLoading}>
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
                <TabsTrigger value="units">Unidades</TabsTrigger>
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
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
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
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            disabled={isLoading}
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
              Nenhum item cadastrado. Use "Restaurar Padrões" ou adicione manualmente.
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