import { KeyRound, ServerCog, ShieldCheck } from "lucide-react"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar"

const items = [
  {
    icon: ServerCog,
    title: "运行时",
    text: "读取 opencode 当前的 MCP 状态，并触发连接、断开和重试操作。",
  },
  {
    icon: KeyRound,
    title: "授权",
    text: "远程服务支持自动授权，也支持手动填写授权码完成认证。",
  },
  {
    icon: ShieldCheck,
    title: "配置",
    text: "MCP 配置通过 opencode 的全局配置接口持久化，所有工作区复用同一套设置。",
  },
]

export function McpSidebarPanel() {
  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">MCP 服务</div>
          <p className="text-muted-foreground text-xs leading-5">
            管理运行中的 MCP 服务，以及 opencode 为它们保存的全局配置。
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>说明</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            {items.map((item) => (
              <div key={item.title} className="bg-background rounded-xl border px-3 py-3 shadow-xs">
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="text-primary size-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-5">{item.text}</p>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}
