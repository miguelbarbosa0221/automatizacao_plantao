"use client"

import { Activity, ClipboardList, PlusCircle, Settings } from "lucide-react"
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
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

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
      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-bold">
          v1.2 - Powered by Gemini
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
