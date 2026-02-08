
"use client"

import { Activity, ClipboardList, PlusCircle, Settings, ShieldCheck, User, LogOut } from "lucide-react"
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
import { useUser, useAuth } from "@/firebase"
import { Badge } from "@/components/ui/badge"
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { useToast } from "@/hooks/use-toast"

export function AppSidebar() {
  const pathname = usePathname()
  const { isAdmin, profile, user } = useUser()
  const auth = useAuth()
  const { toast } = useToast()

  const items = [
    {
      title: "Dashboard",
      url: "/",
      icon: Activity,
    },
    {
      title: "Nova Demanda",
      url: "/demands/new",
      icon: PlusCircle,
    },
    {
      title: "Histórico",
      url: "/demands/history",
      icon: ClipboardList,
    },
  ]

  if (isAdmin) {
    items.push({
      title: "Configurações",
      url: "/settings",
      icon: Settings,
    })
  }

  const handleLogout = () => {
    // Apenas inicia o logout. O AuthInitializer cuidará do redirecionamento
    // assim que o estado do Firebase mudar para nulo.
    initiateSignOut(auth)
    toast({ title: "Sessão encerrada", description: "Você saiu do sistema com segurança." })
  }

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-bold text-xl text-primary-foreground bg-primary p-2 rounded-lg">
          <Activity className="w-6 h-6" />
          <span>PlantãoAI</span>
        </div>
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
        <div className="flex flex-col gap-2 p-2 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2">
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
            <span className="text-xs font-bold uppercase truncate">
              {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{profile?.email || user?.email || 'Saindo...'}</p>
        </div>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
              <span>Sair do Sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-bold">
          v2.0 - Email Auth
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
