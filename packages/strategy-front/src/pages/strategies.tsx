import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FolderInput, Plus, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog"
import { StrategyImportDialog } from "@/components/strategy/strategy-import-dialog"
import { StrategyList } from "@/components/strategy/strategy-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkspaceCreateDialog } from "@/components/workspace/workspace-create-dialog"
import { useWorkspaceList } from "@/data/global-data"
import { cn } from "@/lib/utils"
import type { LocalWorkspace } from "@/types/workspace"

function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return text
}

export default function StrategiesPage() {
  const nav = useNavigate()
  const { workspaces, loading, error, refresh, select } = useWorkspaceList()
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [q, setQ] = useState("")
  const [item, setItem] = useState<LocalWorkspace | null>(null)
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    const base = workspaces
      .filter((item) => item.source !== "external")
      .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
    return base.filter((item) => {
      if (!key) return true
      return (
        item.name.toLowerCase().includes(key) ||
        item.keywords.some((word) => word.toLowerCase().includes(key)) ||
        (item.type ?? "").toLowerCase().includes(key) ||
        (item.source ?? "").toLowerCase().includes(key)
      )
    })
  }, [q, workspaces])

  const onSelect = (item: LocalWorkspace) => {
    nav(`/app?path=${encodeURIComponent(item.path)}`)
  }

  const onDelete = async () => {
    if (!item) return
    setBusy(true)
    try {
      await workspaceApi.removeWorkspace(item.path)
      toast.success(`已从列表移除策略：${item.name}`)
      await refresh()
      setItem(null)
    } catch (err) {
      toast.error(note(err, `移除 ${item.name} 失败`))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background dark:border-[#2a2f2d] dark:bg-[#111414]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">策略</div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                浏览所有已登记的策略工作区。你可以创建、导入、移除，或直接进入策略对话。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 bg-white text-slate-900 hover:bg-slate-100 dark:border-[#33403b] dark:bg-[#171c1b] dark:text-[#e3ece7] dark:hover:bg-[#1d2321]"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 bg-white text-slate-900 hover:bg-slate-100 dark:border-[#33403b] dark:bg-[#171c1b] dark:text-[#e3ece7] dark:hover:bg-[#1d2321]"
                onClick={() => setImportOpen(true)}
              >
                <FolderInput className="size-4" />
                导入目录
              </Button>
              <Button
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#5fa38d] dark:text-[#08110e] dark:hover:bg-[#74b19d]"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-4" />
                新建策略
              </Button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="按名称、关键词、类型或来源搜索..."
                className="h-9 rounded-xl border-slate-200 bg-background pl-10 shadow-sm dark:border-[#4f7769] dark:bg-[#1a1f1e] dark:text-[#e3ece7] dark:shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">{list.length} 个策略</div>
            <div className="text-xs text-muted-foreground dark:text-slate-400">从列表移除不会删除本地目录。</div>
          </div>
          <StrategyList
            items={list}
            loading={loading}
            error={error}
            onRetry={() => void refresh()}
            onSelect={onSelect}
            onDelete={setItem}
          />
        </div>
      </div>

      <WorkspaceCreateDialog open={open} onOpenChange={setOpen} />
      <StrategyImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onDone={async (item) => {
          await refresh()
          select(item)
          nav(`/app?path=${encodeURIComponent(item.path)}`)
        }}
      />
      <DeleteConfirmDialog
        open={!!item}
        busy={busy}
        title="从列表移除策略"
        name={item?.name ?? ""}
        desc="这只会移除登记记录，本地目录不会被删除，之后仍可再次导入。"
        onOpenChange={(value) => {
          if (!value) setItem(null)
        }}
        onConfirm={() => void onDelete()}
      />
    </div>
  )
}
