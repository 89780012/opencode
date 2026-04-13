"use client"

import { Bot, Command, MessageSquareText, PlugZap, ServerCog, Settings2, Sparkles } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useSystem } from "@/components/system/system-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const nav = [
  {
    title: "策略",
    url: "/app/strategies",
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
  {
    title: "设置",
    url: "/app/settings",
    icon: Settings2,
  },
]

function tone(kind: "dev" | "stable") {
  if (kind === "stable") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function label(kind: "dev" | "stable") {
  if (kind === "stable") {
    return "生产版"
  }

  return "开发版"
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const route = useLocation()
  const { ver, vload, verr } = useSystem()
  const path = route.pathname
  const row = ver.current
  const pick = (url: string) => path.startsWith(url)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-3 border-b">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <SidebarMenu className="flex-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <NavLink to="/app/strategies">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">SmartX</span>
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="size-8 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    isActive={pick(item.url)}
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
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          {vload ? (
            <div className="text-muted-foreground rounded-md border px-2 py-1 text-xs">读取版本中...</div>
          ) : verr ? (
            <div className="text-muted-foreground rounded-md border px-2 py-1 text-xs">版本信息不可用</div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex w-full items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${tone(row.channel)}`}
                >
                  <span className="truncate">{`${label(row.channel)} ${row.version}`}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="max-w-64 space-y-1 px-3 py-2">
                <div>版本: {row.version}</div>
                <div>通道: {label(row.channel)}</div>
                <div>环境: {row.env === "production" ? "生产" : "开发"}</div>
                {row.commit ? <div>Commit: {row.commit}</div> : null}
                {row.built_at ? <div>构建时间: {row.built_at}</div> : null}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
