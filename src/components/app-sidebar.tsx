
"use client"

import { Activity, ClipboardList, PlusCircle, Settings, User, LogOut } from "lucide-react"
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
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { useToast } from "@/hooks/use-toast"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const auth = useAuth()
  const { toast } = useToast()

  const items = [
    { title: "Dashboard", url: "/", icon: Activity },
    { title: "Nova Demanda", url: "/demands/new", icon: PlusCircle },
    { title: "Histórico", url: "/demands/history", icon: ClipboardList },
    { title: "Configurações", url: "/settings", icon: Settings },
  ]

  const handleLogout = () => {
    initiateSignOut(auth)
    toast({ title: "Sessão encerrada" })
  }

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-bold text-xl text-primary p-2">
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
        <div className="flex flex-col gap-1 p-2 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase truncate">Minha Conta</span>
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
