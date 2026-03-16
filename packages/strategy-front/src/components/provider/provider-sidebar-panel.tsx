import { PlugZap, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  {
    icon: PlugZap,
    title: "连接提供商",
    text: "支持使用 API 密钥、OAuth 授权，或接入自定义兼容 OpenAI 的提供商。",
  },
  {
    icon: ShieldCheck,
    title: "认证与断开",
    text: "可以查看当前接入来源，并断开非环境变量加载的提供商。",
  },
  {
    icon: SlidersHorizontal,
    title: "配置更新",
    text: "自定义提供商会更新全局配置，并同步处理 disabled_providers。",
  },
];

export function ProviderSidebarPanel() {
  return (
    <>
      <SidebarHeader className="border-b p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">提供商</div>
          <p className="text-muted-foreground text-xs leading-5">
            管理提供商连接、认证流程，以及自定义提供商配置。
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
