import { Bot, FileCode2, RefreshCcw } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  {
    icon: Bot,
    title: "运行时结果",
    text: "直接读取 opencode /agent，查看当前选中工作区实际生效的 agent 列表。",
  },
  {
    icon: FileCode2,
    title: "全局文件",
    text: "自定义 agent 会写入 ~/.config/opencode/agents/<name>.md。",
  },
  {
    icon: RefreshCcw,
    title: "重新加载",
    text: "保存文件后需要重启 opencode 服务，当前运行时 agent 列表才会刷新。",
  },
];

export function AgentSidebarPanel() {
  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Agents</div>
          <p className="text-muted-foreground text-xs leading-5">
            这里分开展示当前工作区生效的 agent 列表，以及你维护的全局 Markdown agent 文件。
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
  );
}
