import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function Layout() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="bg-background z-50 flex h-10 items-center gap-2 border-b p-2 box-border">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex h-[calc(100vh-40px)] min-w-0 flex-col box-content">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
