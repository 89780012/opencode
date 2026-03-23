import { FileCode2, RefreshCcw, Sparkles } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  {
    icon: Sparkles,
    title: "当前生效",
    text: "直接读取 opencode /skill，查看当前实际可用的 skills。",
  },
  {
    icon: FileCode2,
    title: "全局文件",
    text: "自定义 skill 会写入 ~/.config/opencode/skills/<name>/SKILL.md。",
  },
  {
    icon: RefreshCcw,
    title: "重新加载",
    text: "保存文件后需要重启 opencode 服务，当前生效列表才会刷新。",
  },
];

export function SkillSidebarPanel() {
  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Skills</div>
          <p className="text-muted-foreground text-xs leading-5">
            这里分开展示当前生效 skills 和你维护的自定义全局 skill 文件。
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
