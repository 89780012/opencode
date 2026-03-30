import { FolderOpen, Plus, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { projectApi } from "@/api/modules/project"
import { workspaceApi } from "@/api/modules/workspace"
import { useWorkspaceList } from "@/data/global-data-provider"
import { LocalWorkspaceList } from "@/components/workspace/local-workspace-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  onPick?: () => void
}

export function LocalWorkspaceTab(props: Props) {
  const { basePath, error, loading, refresh, select, selected, workspaces } = useWorkspaceList()
  const workspace = selected
  const selectedPath = workspace?.path ?? null
  const [createOpen, setCreateOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [gitNew, setGitNew] = useState(true)
  const [gitOpen, setGitOpen] = useState(false)
  const [initing, setIniting] = useState<string | null>(null)

  const onPick = async (item: LocalWorkspace) => {
    try {
      const data = await workspaceApi.openWorkspace(item.path, gitOpen)
      await ensureGit(data.workspace.path, gitOpen)
      await refresh()
      select(data.workspace)
      setOpenOpen(false)
      props.onPick?.()
    } catch (err) {
      console.error("Failed to open workspace", err)
      toast.error("Failed to open workspace")
    }
  }

  const onRefresh = async () => {
    await refresh()
  }

  const ensureGit = async (path: string, enabled: boolean) => {
    if (!enabled) {
      return
    }

    await projectApi.initGit(path)
  }

  const onInitGit = async (item: LocalWorkspace) => {
    setIniting(item.path)
    try {
      await projectApi.initGit(item.path)
      await refresh()
      toast.success(`git初始化: ${item.name}`)
    } catch (err) {
      console.error("Failed to init git", err)
      toast.error("初始化git失败")
    } finally {
      setIniting(null)
    }
  }

  const onCreate = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("工作区名称不能为空")
      return
    }

    setBusy(true)
    try {
      const data = await workspaceApi.createWorkspace(value, gitNew)
      const next = await workspaceApi.openWorkspace(data.workspace.path, false)
      //await ensureGit(data.workspace.path, gitNew)
      await refresh()
      select(next.workspace)
      props.onPick?.()
      setCreateOpen(false)
      setName("")
      setGitNew(true)
      toast.success(`工作区已创建: ${data.workspace.name}`)
    } catch (err) {
      console.error("Failed to create workspace", err)
      toast.error("创建工作区失败")
    } finally {
      setBusy(false)
    }
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
              initingPath={initing}
              onRetry={() => {
                void onRefresh()
              }}
              onSelect={(item) => {
                void onPick(item)
              }}
              onInitGit={(item) => {
                void onInitGit(item)
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建工作区</DialogTitle>
            <DialogDescription>在 {basePath || "~/.xtp-smart/plugins"} 创建后打开它.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="工作区名称"
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return
                }
                event.preventDefault()
                void onCreate()
              }}
            />
            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">初始化git仓库</div>
                <div className="text-xs text-muted-foreground">
                  在创建工作区后运行 <code>git init</code>
                </div>
              </div>
              <Switch checked={gitNew} onCheckedChange={setGitNew} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void onCreate()} disabled={busy}>
              {busy ? "创建中..." : "创建并打开"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openOpen} onOpenChange={setOpenOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>打开文件夹</DialogTitle>
            <DialogDescription>选择 {basePath || "~/.xtp-smart/plugins"} 下的现有工作区。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">初始化git仓库</div>
                <div className="text-xs text-muted-foreground">
                  在创建工作区后运行 <code>git init</code>
                </div>
              </div>
              <Switch checked={gitOpen} onCheckedChange={setGitOpen} />
            </label>
            <div className="custom-scrollbar max-h-[420px] overflow-x-hidden overflow-y-auto rounded-md border">
              <LocalWorkspaceList
                loading={loading}
                error={error}
                basePath={basePath}
                workspaces={workspaces}
                selectedPath={selectedPath}
                initingPath={initing}
                onRetry={() => {
                  void onRefresh()
                }}
                onSelect={(item) => {
                  void onPick(item)
                }}
                onInitGit={(item) => {
                  void onInitGit(item)
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
