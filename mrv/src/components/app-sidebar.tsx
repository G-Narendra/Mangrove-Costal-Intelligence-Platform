
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Map as MapIcon,
  Waves,
  Bell,
  ShieldAlert,
  Settings,
  BarChart3,
  Users,
  Sparkles,
  FileText,
  Anchor,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"

const navItems = [
  {
    title: "Overview",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "System Alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    title: "Featured Alerts",
    url: "/alerts/featured",
    icon: ShieldAlert,
  },
  {
    title: "Coastal Map",
    url: "/map",
    icon: MapIcon,
  },
  {
    title: "Analytics Engine",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "UAE Registry",
    url: "/carbon",
    icon: Waves,
  },
  {
    title: "ESG Communities",
    url: "/impact",
    icon: Users,
  },
  {
    title: "XAI Specialist",
    url: "/xai",
    icon: Sparkles,
  },
  {
    title: "Intelligence Reports",
    url: "/reports",
    icon: FileText,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const auth = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    router.push("/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent data-[state=open]:bg-transparent">
              <Link href="/" className="flex items-center gap-3">
                <div className="bg-primary flex aspect-square size-10 items-center justify-center rounded-xl text-primary-foreground shadow-xl shadow-primary/20 shrink-0">
                  <Anchor className="size-6" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-headline font-bold text-lg tracking-tight text-primary">MCIP</span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">National Sentinel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-12 rounded-lg transition-all duration-200 hover:bg-primary/5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary font-bold"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className={`size-5 shrink-0 ${pathname === item.url ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs uppercase tracking-tight group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/settings"}
              tooltip="System Infrastructure"
              className="h-12 rounded-lg font-bold hover:bg-primary/5 data-[active=true]:bg-primary/10"
            >
              <Link href="/settings" className="flex items-center gap-3">
                <Settings className="size-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden text-xs uppercase tracking-tight">System Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Terminate Session"
              className="h-12 rounded-lg font-bold text-destructive hover:bg-destructive/5"
            >
              <LogOut className="size-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden text-xs uppercase tracking-tight">Terminate Session</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
