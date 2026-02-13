
"use client"

import { Activity, ClipboardList, PlusCircle, Settings, ShieldCheck, User, LogOut, Building } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useAuth, useFirestore } from "@/firebase"
import { Badge } from "@/components/ui/badge"
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { doc, updateDoc } from "firebase/firestore"

export function AppSidebar() {
  const pathname = usePathname()
  const { isAdmin, profile, user, activeCompanyId } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()

  const items = [
    { title: "Dashboard", url: "/", icon: Activity },
    { title: "Nova Demanda", url: "/demands/new", icon: PlusCircle },
    { title: "Histórico", url: "/demands/history", icon: ClipboardList },
  ]

  if (isAdmin) {
    items.push({ title: "Configurações", url: "/settings", icon: Settings })
  }

  const handleCompanyChange = async (companyId: string) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'profileDoc');
    await updateDoc(profileRef, { activeCompanyId: companyId });
    toast({ title: "Empresa alterada", description: "Contexto de dados atualizado." });
  }

  const handleLogout = () => {
    initiateSignOut(auth)
    toast({ title: "Sessão encerrada" })
  }

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 space-y-4">
        <div className="flex items-center gap-2 font-bold text-xl text-primary-foreground bg-primary p-2 rounded-lg">
          <Activity className="w-6 h-6" />
          <span>PlantãoAI</span>
        </div>
        
        {profile?.companies && profile.companies.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Organização</span>
            <Select value={activeCompanyId || ""} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-full bg-accent/5 font-medium border-border/50">
                <SelectValue placeholder="Selecione Empresa" />
              </SelectTrigger>
              <SelectContent>
                {profile.companies.map((co: any) => (
                  <SelectItem key={co.id} value={co.id}>{co.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <Link href={item.url}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-border/50 space-y-4">
        <div className="flex flex-col gap-1 p-2 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2">
            {isAdmin ? <ShieldCheck className="w-3 h-3 text-primary" /> : <User className="w-3 h-3" />}
            <span className="text-[10px] font-bold uppercase truncate">{isAdmin ? 'Admin' : 'Usuário'}</span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        
        <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}
