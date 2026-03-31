import { FolderOpen, Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
import { LocalWorkspaceList } from "@/components/workspace/local-workspace-list"
import { WorkspaceCreateDialog } from "@/components/workspace/workspace-create-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "@/components/ui/sidebar"
import { useWorkspaceList } from "@/data/global-data-provider"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  onPick?: () => void
}

function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) return err.message
  return text
}

export function LocalWorkspaceTab(props: Props) {
  const { basePath, error, loading, refresh, select, selected, workspaces } = useWorkspaceList()
  const selectedPath = selected?.path ?? null
  const [createOpen, setCreateOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)

  const onPick = async (item: LocalWorkspace) => {
    try {
      const data = await workspaceApi.openWorkspace(item.path)
      await refresh()
      select(data.workspace)
      setOpenOpen(false)
      props.onPick?.()
    } catch (err) {
      console.error("Failed to open workspace", err)
      toast.error(note(err, "打开工作区失败"))
    }
  }

  const onRefresh = async () => {
    await refresh()
  }

  return (
    <>
      <SidebarHeader className="gap-2 border-b p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            新建工作区
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpenOpen(true)}>
            <FolderOpen className="size-4" />
            打开文件夹
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            void onRefresh()
          }}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          {loading ? "刷新中..." : "刷新工作区"}
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <SidebarGroup className="h-full px-0">
          <SidebarGroupContent className="h-full overflow-hidden">
            <LocalWorkspaceList
              loading={loading}
              error={error}
              basePath={basePath}
              workspaces={workspaces}
              selectedPath={selectedPath}
              onRetry={() => {
                void onRefresh()
              }}
              onSelect={(item) => {
                void onPick(item)
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <WorkspaceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onDone={() => {
          props.onPick?.()
        }}
      />

      <Dialog open={openOpen} onOpenChange={setOpenOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>打开文件夹</DialogTitle>
            <DialogDescription>选择 {basePath || "~/.xtp-smart/plugins"} 下的现有工作区。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              打开后会自动确保 Git 仓库已初始化。
            </div>
            <div className="custom-scrollbar max-h-[420px] overflow-x-hidden overflow-y-auto rounded-md border">
              <LocalWorkspaceList
                loading={loading}
                error={error}
                basePath={basePath}
                workspaces={workspaces}
                selectedPath={selectedPath}
                onRetry={() => {
                  void onRefresh()
                }}
                onSelect={(item) => {
                  void onPick(item)
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
