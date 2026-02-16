
"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, RotateCcw, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

interface PersonalConfig {
  categories: string[];
  units: string[];
}

const DEFAULT_CONFIG = {
  categories: ["Hardware", "Software", "Rede", "Impressora", "Outros"],
  units: ["UTI", "Emergência", "Recepção", "Centro Cirúrgico", "Administrativo"]
};

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<PersonalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    if (user?.uid && db) {
      loadData();
    }
  }, [user?.uid, db]);

  async function loadData() {
    if (!user?.uid || !db) return;
    setIsLoading(true);
    try {
      const catsRef = collection(db, "users", user.uid, "categories");
      const unitsRef = collection(db, "users", user.uid, "units");
      
      const [catsSnap, unitsSnap] = await Promise.all([getDocs(catsRef), getDocs(unitsRef)]);
      
      const categories = catsSnap.docs.map(d => d.data().name as string);
      const units = unitsSnap.docs.map(d => d.data().name as string);

      setConfig({ categories, units });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao carregar configurações pessoais." });
    }
    setIsLoading(false);
  }

  const handleAdd = async (type: 'categories' | 'units', value: string, setter: (s: string) => void) => {
    if (!value.trim() || !user?.uid || !db) return;
    try {
      const id = `${type === 'categories' ? 'cat' : 'unit'}-${Date.now()}`;
      await setDoc(doc(db, "users", user.uid, type, id), { id, name: value, active: true });
      setter("");
      await loadData();
      toast({ title: "Item adicionado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar item." });
    }
  };

  const handleRemove = async (type: 'categories' | 'units', value: string) => {
    if (!user?.uid || !db) return;
    try {
      const colRef = collection(db, "users", user.uid, type);
      const snap = await getDocs(colRef);
      const target = snap.docs.find(d => d.data().name === value);
      if (target) {
        await deleteDoc(doc(db, "users", user.uid, type, target.id));
        await loadData();
        toast({ title: "Item removido." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover item." });
    }
  };

  const resetDefaults = async () => {
    if (!user?.uid || !db) return;
    if (!confirm("Restaurar categorias e unidades padrão?")) return;
    setIsLoading(true);
    try {
      for (const cat of DEFAULT_CONFIG.categories) {
        const id = `cat-${cat.toLowerCase().replace(/\s/g, '-')}`;
        await setDoc(doc(db, "users", user.uid, "categories", id), { id, name: cat, active: true });
      }
      for (const unit of DEFAULT_CONFIG.units) {
        const id = `unit-${unit.toLowerCase().replace(/\s/g, '-')}`;
        await setDoc(doc(db, "users", user.uid, "units", id), { id, name: unit, active: true });
      }
      await loadData();
      toast({ title: "Padrões restaurados." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao restaurar." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">Meu Catálogo Pessoal</h1>
            </div>
            <Button variant="outline" size="sm" onClick={resetDefaults} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-2" /> Padrões
            </Button>
          </header>

          <main className="flex-1 p-6 space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg border">
              <UserCircle className="w-5 h-5" />
              <p className="text-sm">Estas configurações são exclusivas para sua conta: <strong>{user?.email}</strong></p>
            </div>

            <Tabs defaultValue="categories">
              <TabsList className="mb-4">
                <TabsTrigger value="categories">Minhas Categorias</TabsTrigger>
                <TabsTrigger value="units">Minhas Unidades</TabsTrigger>
              </TabsList>

              <TabsContent value="categories">
                <ConfigCard 
                  title="Categorias"
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
                  title="Unidades"
                  items={config?.units || []}
                  inputValue={newUnit}
                  onInputChange={setNewUnit}
                  onAdd={() => handleAdd('units', newUnit, setNewUnit)}
                  onRemove={(val: string) => handleRemove('units', val)}
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

function ConfigCard({ title, items, inputValue, onInputChange, onAdd, onRemove, isLoading }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Personalize sua lista de seleção para novos registros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Adicionar novo..." value={inputValue} onChange={(e) => onInputChange(e.target.value)} disabled={isLoading} />
          <Button onClick={onAdd} disabled={isLoading}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {items.map((item: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
              {item}
              <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-destructive" onClick={() => onRemove(item)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {items.length === 0 && !isLoading && <p className="text-xs text-muted-foreground italic">Nenhum item cadastrado.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
