"use client"

import { Bot, Command, MessageSquareText, PlugZap, ServerCog, Sparkles } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { AgentSidebarPanel } from "@/components/agent/agent-sidebar-panel"
import { HomeSidebarPanel } from "@/components/home/home-sidebar-panel"
import { McpSidebarPanel } from "@/components/mcp/mcp-sidebar-panel"
import { NavUser } from "@/components/nav-user"
import { ProviderSidebarPanel } from "@/components/provider/provider-sidebar-panel"
import { SkillSidebarPanel } from "@/components/skill/skill-sidebar-panel"
import { SystemSidebarPanel } from "@/components/system/system-sidebar-panel"
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

const data = {
  nav: [
    {
      title: "对话",
      url: "/app",
      icon: MessageSquareText,
    },
    {
      title: "提供商",
      url: "/app/providers",
      icon: PlugZap,
    },
    {
      title: "MCP 服务",
      url: "/app/mcp",
      icon: ServerCog,
    },
    {
      title: "Agents",
      url: "/app/agents",
      icon: Bot,
    },
    {
      title: "Skills",
      url: "/app/skills",
      icon: Sparkles,
    },
  ],
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const route = useLocation()
  const path = route.pathname
  const home = path === "/app"
  const provider = path.startsWith("/app/providers")
  const mcp = path.startsWith("/app/mcp")
  const agent = path.startsWith("/app/agents")
  const skill = path.startsWith("/app/skills")
  const system = path.startsWith("/app/settings") || path.startsWith("/app/installer")
  const pick = (url: string) => (url === "/app" ? path === "/app" : path.startsWith(url))

  return (
    <Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row" {...props}>
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <NavLink to="/app">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Strategy</span>
                    <span className="truncate text-xs">Desktop</span>
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.nav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      isActive={pick(item.url)}
                      className="px-2.5 md:px-2"
                    >
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      <Sidebar collapsible="none" className="flex-1">
        {home ? (
          <HomeSidebarPanel />
        ) : provider ? (
          <ProviderSidebarPanel />
        ) : mcp ? (
          <McpSidebarPanel />
        ) : agent ? (
          <AgentSidebarPanel />
        ) : skill ? (
          <SkillSidebarPanel />
        ) : system ? (
          <SystemSidebarPanel />
        ) : (
          <HomeSidebarPanel />
        )}
      </Sidebar>
    </Sidebar>
  )
}
