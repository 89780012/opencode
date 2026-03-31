import { Outlet } from "react-router-dom"
import { ProviderSidebarPanel } from "@/components/provider/provider-sidebar-panel"

export default function Page() {
  return (
    <div className="flex h-full min-h-0 min-w-0">
      <aside className="bg-sidebar text-sidebar-foreground hidden h-full w-[280px] shrink-0 border-r md:flex md:flex-col">
        <ProviderSidebarPanel />
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
