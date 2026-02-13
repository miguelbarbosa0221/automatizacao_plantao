
"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Building2, Tags, RotateCcw, X, Pencil, Loader2, ChevronRight, ListPlus, ShieldAlert, Globe, DatabaseZap, Check } from "lucide-react"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const normalizeSubs = (subs: any[]): {name: string, items: string[]}[] => {
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, items: [] };
    return { name: s?.name || 'Sem nome', items: s?.items || [] };
  });
};

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { isAdmin, activeCompanyId, isUserLoading } = useUser()

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return collection(db, "companies", activeCompanyId, "categories");
  }, [db, activeCompanyId]);

  const unitsQuery = useMemoFirebase(() => {
    if (!db || !activeCompanyId) return null;
    return collection(db, "companies", activeCompanyId, "units");
  }, [db, activeCompanyId]);

  const { data: categoriesData, isLoading: isCatLoading } = useCollection(categoriesQuery);
  const { data: unitsData, isLoading: isUnitLoading } = useCollection(unitsQuery);

  const categories = useMemo(() => categoriesData || [], [categoriesData]);
  const units = useMemo(() => unitsData || [], [unitsData]);

  const [newCatName, setNewCatName] = useState("")
  const [catSubs, setCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [tempSubName, setTempSubName] = useState("")
  const [newUnitName, setNewUnitName] = useState("")
  const [unitSectors, setUnitSectors] = useState<string[]>([])
  const [tempSector, setTempSector] = useState("")
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatSubs, setEditCatSubs] = useState<{name: string, items: string[]}[]>([])
  const [editTempSub, setEditTempSub] = useState("")
  const [activeSubForItems, setActiveSubForItems] = useState<number | null>(null)
  const [tempItemName, setTempItemName] = useState("")
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [editUnitName, setEditUnitName] = useState("")
  const [editUnitSectors, setEditUnitSectors] = useState<string[]>([])
  const [editTempSector, setEditTempSector] = useState("")
  const [itemToDelete, setItemToDelete] = useState<{type: 'categories' | 'units', id: string} | null>(null)
  const [subEditIndex, setSubEditIndex] = useState<number | null>(null)
  const [subEditValue, setSubEditValue] = useState("")

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <SidebarInset>
          <main className="flex flex-col items-center justify-center h-full space-y-4">
            <ShieldAlert className="w-16 h-16 text-destructive opacity-50" />
            <h1 className="text-2xl font-bold font-headline">Acesso Restrito</h1>
            <p className="text-muted-foreground">Somente administradores da empresa podem gerenciar o catálogo.</p>
          </main>
        </SidebarInset>
      </div>
    )
  }

  const handleAddCategory = () => {
    if (!newCatName.trim() || !db || !activeCompanyId) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "companies", activeCompanyId, "categories", id);
    setDocumentNonBlocking(docRef, { id, name: newCatName.trim(), subcategories: catSubs, active: true }, { merge: true });
    setNewCatName(""); setCatSubs([]);
    toast({ title: "Sucesso", description: "Categoria salva." });
  }

  const handleUpdateCategory = () => {
    if (!editCatName.trim() || !db || !activeCompanyId) return;
    const id = editingCategory?.id;
    const docRef = doc(db, "companies", activeCompanyId, "categories", id);
    updateDocumentNonBlocking(docRef, { name: editCatName.trim(), subcategories: editCatSubs });
    setEditingCategory(null);
  }

  const handleAddUnit = () => {
    if (!newUnitName.trim() || !db || !activeCompanyId) return;
    const id = Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, "companies", activeCompanyId, "units", id);
    setDocumentNonBlocking(docRef, { id, name: newUnitName.trim(), sectors: unitSectors, active: true }, { merge: true });
    setNewUnitName(""); setUnitSectors([]);
  }

  const toggleStatus = (type: 'categories' | 'units', id: string, active: boolean) => {
    if (!db || !activeCompanyId) return;
    const docRef = doc(db, "companies", activeCompanyId, type, id);
    updateDocumentNonBlocking(docRef, { active });
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-headline">Catálogo da Organização</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="units">Unidades</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Nova Categoria</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Nome da Categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    <Button onClick={handleAddCategory} className="w-full">Adicionar</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Categorias Ativas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between p-2 border-b">
                          <span>{cat.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(cat); setEditCatName(cat.name); setEditCatSubs(normalizeSubs(cat.subcategories)); }}><Pencil className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  )
}
