import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Boxes, Plus, RefreshCw, Search } from "lucide-react"
import { GroupCreateDialog } from "@/components/group/group-create-dialog"
import { GroupList } from "@/components/group/group-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useGroupList } from "@/hooks/use-group-list"
import type { StrategyGroup } from "@/types/group"

const tabs = [
  { id: "all", label: "全部" },
  { id: "2", label: "双策略" },
  { id: "3", label: "三策略" },
  { id: "recent", label: "最近更新" },
] as const

export default function GroupsPage() {
  const nav = useNavigate()
  const { groups, loading, error, refresh, prepend } = useGroupList()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all")

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    const base = [...groups].sort((a, b) => b.updated_at - a.updated_at)
    const next = base.filter((group) => {
      if (!key) return true
      return (
        group.name.toLowerCase().includes(key) ||
        group.items.some((item) => item.workspace.name.toLowerCase().includes(key))
      )
    })
    if (tab === "2" || tab === "3") return next.filter((group) => String(group.count) === tab)
    if (tab === "recent") return next
    return next
  }, [groups, q, tab])

  const onSelect = (group: StrategyGroup) => {
    nav(`/app/groups/${group.id}`)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background dark:border-[#2a2f2d] dark:bg-[#111414]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-[#33403b] dark:bg-[#171c1b] dark:text-[#d7dfdb]">
                <Boxes className="size-3.5" />
                组合策略
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">我的组合策略</div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                这里展示你创建的全部组合策略。每个组合会自动对应 2 或 3 个真实工作区，进入后可以分屏和 AI 并行协作。
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#5fa38d] dark:text-[#08110e] dark:hover:bg-[#74b19d]"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-4" />
                新建组合策略
              </Button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索组合策略或工作区名称..."
                className="h-10 rounded-xl border-slate-200 bg-background pl-10 shadow-sm dark:border-[#4f7769] dark:bg-[#1a1f1e] dark:text-[#e3ece7] dark:shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === item.id
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-[#6f9b8d] dark:bg-[#6f9b8d] dark:text-[#09120f]"
                      : "border-border bg-background text-muted-foreground hover:border-slate-300 hover:text-foreground dark:border-[#2f3734] dark:bg-[#171c1b] dark:text-[#98a39e] dark:hover:border-[#46665b] dark:hover:text-[#dfe8e3]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">共 {list.length} 个组合策略</div>
            <div className="text-xs text-muted-foreground dark:text-slate-400">卡片展示仅用于管理自己的组合策略</div>
          </div>
          <GroupList groups={list} loading={loading} error={error} onRetry={() => void refresh()} onSelect={onSelect} />
        </div>
      </div>

      <GroupCreateDialog
        open={open}
        onOpenChange={setOpen}
        onDone={(group) => {
          prepend(group)
          window.dispatchEvent(new Event("group:changed"))
        }}
      />
    </div>
  )
}
