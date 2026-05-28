import type { CSSProperties } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Layout() {
  const route = useLocation()

  if (route.pathname === "/app") {
    return (
      <div className="h-screen min-w-0">
        <Outlet />
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="flex h-screen min-w-0 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
