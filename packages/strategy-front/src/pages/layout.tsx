import type { CSSProperties } from "react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { useSystem } from "@/components/system/system-provider"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function tone(kind: "dev" | "stable") {
  if (kind === "stable") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function label(kind: "dev" | "stable") {
  if (kind === "stable") {
    return "生产版"
  }

  return "开发版"
}

export default function Layout() {
  const { ver, vload, verr } = useSystem()
  const row = ver.current

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
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            {vload ? (
              <span className="text-muted-foreground">读取版本中...</span>
            ) : verr ? (
              <span className="text-muted-foreground">版本信息不可用</span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex rounded-full border px-2 py-0.5 font-medium ${tone(row.channel)}`}
                  >
                    {label(row.channel)}
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8} className="max-w-64 space-y-1 px-3 py-2">
                  <div>版本: {row.version}</div>
                  <div>通道: {label(row.channel)}</div>
                  <div>环境: {row.env === "production" ? "生产" : "开发"}</div>
                  {row.commit ? <div>Commit: {row.commit}</div> : null}
                  <div>工作区: {row.dirty ? "dirty" : "clean"}</div>
                  {row.built_at ? <div>构建时间: {row.built_at}</div> : null}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </header>
        <div className="flex h-[calc(100vh-40px)] min-w-0 flex-col box-content">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
