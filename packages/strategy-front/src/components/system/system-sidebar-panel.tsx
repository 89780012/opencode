import { Boxes, Palette, PlayCircle, ScrollText } from "lucide-react"
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

const items = [
  {
    icon: Palette,
    title: "外观",
    url: "/settings/appearance",
    text: "管理主题模式和主题色，让桌面端界面风格保持一致。",
  },
  {
    icon: PlayCircle,
    title: "运行",
    url: "/settings/runtime",
    text: "查看 opencode 运行状态、启动方式、进程信息和最近输出。",
  },
  {
    icon: ScrollText,
    title: "日志",
    url: "/settings/logs",
    text: "查看 strategy-service 与 opencode 启动日志，并配置默认查看行数。",
  },
  {
    icon: Boxes,
    title: "工具",
    url: "/settings/tools",
    text: "保留本地依赖检测与一键安装，作为系统设置的一部分。",
  },
]

export function SystemSidebarPanel() {
  const route = useLocation()
  const path = route.pathname

  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">系统设置</div>
          <p className="text-muted-foreground text-xs leading-5">
            把桌面端常驻配置收敛到一个地方，包含外观、运行、日志和工具管理。
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
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
            {items.map((item) => (
              <div key={item.url} className="bg-background rounded-xl border px-3 py-3 shadow-xs">
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="text-primary size-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-5">{item.text}</p>
                {path === item.url ? <div className="text-primary mt-3 text-xs font-medium">当前页</div> : null}
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}
