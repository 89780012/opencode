import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import Home from "./Home";
export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="bg-background flex items-center gap-2 p-2 border-b  h-10 box-border z-50">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="h-[calc(100vh-40px)] flex min-w-0 flex-col box-content">
          <Home />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
