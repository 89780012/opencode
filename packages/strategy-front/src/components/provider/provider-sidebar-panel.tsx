import { Bot, PlugZap } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const nav = [
  {
    icon: PlugZap,
    title: "概览",
    url: "/app/providers/overview",
    text: "管理全局提供商连接、认证方式，以及自定义的 OpenAI 兼容提供商。",
  },
  {
    icon: Bot,
    title: "模型",
    url: "/app/providers/models",
    text: "浏览全局提供商模型目录，并控制当前前端展示哪些模型。",
  },
]

export function ProviderSidebarPanel() {
  const { pathname } = useLocation()

  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">全局提供商</div>
          <p className="text-muted-foreground text-xs leading-5">
            提供商与项目解耦，这里只管理全局连接和全局模型目录。
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <NavLink to={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>说明</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            {nav.map((item) => (
              <div key={item.url} className="bg-background rounded-xl border px-3 py-3 shadow-xs">
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="text-primary size-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-5">{item.text}</p>
                {pathname === item.url ? <div className="text-primary mt-3 text-xs font-medium">当前页</div> : null}
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}

