"use client";

import * as React from "react";
import { Command, MessageSquareText, PlugZap, Wrench } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { ChatSessionTab } from "@/components/chatsession/chat-session-tab";
import { ProviderSidebarPanel } from "@/components/provider/provider-sidebar-panel";
import { SystemSidebarPanel } from "@/components/system/system-sidebar-panel";
import { LocalWorkspaceTab } from "@/components/workspace/local-workspace-tab";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  nav: [
    {
      title: "对话",
      url: "/",
      icon: MessageSquareText,
    },
    {
      title: "提供商",
      url: "/providers",
      icon: PlugZap,
    },
    {
      title: "安装检测",
      url: "/installer",
      icon: Wrench,
    },
  ],
};

type Tab = "session" | "workspace";

const tabs: Array<{
  key: Tab;
  label: string;
}> = [
  { key: "session", label: "会话" },
  { key: "workspace", label: "工作区" },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [tab, setTab] = React.useState<Tab>("session");
  const { pathname } = useLocation();
  const home = pathname === "/";
  const provider = pathname.startsWith("/providers");
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <NavLink to="/">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
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
                      isActive={isActive(item.url)}
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
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      <Sidebar collapsible="none" className="flex-1">
        {home ? (
          <>
            <SidebarHeader className="border-b p-1 h-10 box-border">
              <div className="grid grid-cols-2 gap-2">
                {tabs.map((item) => (
                  <Button
                    key={item.key}
                    variant={tab === item.key ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "justify-center px-2",
                      tab === item.key && "font-medium",
                    )}
                    onClick={() => setTab(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </SidebarHeader>

            {tab === "session" ? <ChatSessionTab /> : <LocalWorkspaceTab />}
          </>
        ) : provider ? (
          <ProviderSidebarPanel />
        ) : (
          <SystemSidebarPanel />
        )}
      </Sidebar>
    </Sidebar>
  );
}
