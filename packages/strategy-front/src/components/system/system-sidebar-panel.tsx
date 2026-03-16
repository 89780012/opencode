import { Boxes, Download, ShieldAlert } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  {
    icon: Boxes,
    title: "工具检测",
    text: "检查本机是否已安装 git、node、npm 和 opencode。",
  },
  {
    icon: Download,
    title: "一键安装",
    text: "通过 winget、scoop、choco 或 npm 触发适合 Windows 的安装命令。",
  },
  {
    icon: ShieldAlert,
    title: "失败状态",
    text: "为每个工具保留明确的失败状态、最近输出和任务记录。",
  },
];

export function SystemSidebarPanel() {
  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">安装检测</div>
          <p className="text-muted-foreground text-xs leading-5">
            查看本地运行时工具状态，并在网页中执行引导式安装。
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>说明</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            {items.map((item) => (
              <div
                key={item.title}
                className="bg-background rounded-xl border px-3 py-3 shadow-xs"
              >
                <div className="mb-2 flex items-center gap-2">
                  <item.icon className="text-primary size-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-5">
                  {item.text}
                </p>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
