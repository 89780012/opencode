import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { groupApi } from "@/api/modules/group"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWorkspaceList } from "@/data/global-data-provider"
import { cn } from "@/lib/utils"
import type { StrategyGroup } from "@/types/group"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: (group: StrategyGroup) => void
  redirect?: boolean
  occupied: string[]
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function GroupCreateDialog(props: Props) {
  const nav = useNavigate()
  const { workspaces } = useWorkspaceList()
  const [name, setName] = useState("")
  const [count, setCount] = useState("2")
  const [mode, setMode] = useState("new")
  const [pick, setPick] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const free = useMemo(() => {
    const taken = new Set(props.occupied)
    return [...workspaces]
      .filter((item) => !taken.has(item.path))
      .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
  }, [props.occupied, workspaces])

  const reset = () => {
    setName("")
    setCount("2")
    setMode("new")
    setPick([])
  }

  const want = mode === "pick" ? pick.length : Number(count)

  const toggle = (path: string) => {
    setPick((prev) => {
      if (prev.includes(path)) return prev.filter((item) => item !== path)
      if (prev.length >= 3) return prev
      return [...prev, path]
    })
  }

  const create = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("请输入组合策略名称")
      return
    }
    if (mode === "pick" && (pick.length < 2 || pick.length > 3)) {
      toast.error("请选择 2 到 3 个单策略")
      return
    }

    setBusy(true)
    try {
      const data = await groupApi.create(value, want, mode === "pick" ? pick : undefined)
      props.onDone?.(data.group)
      props.onOpenChange(false)
      reset()
      toast.success(`组合策略已创建：${data.group.name}`)
      if (props.redirect) nav(`/app/groups/${data.group.id}`)
    } catch (err) {
      console.error("Failed to create group", err)
      toast.error(note(err, "创建组合策略失败"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open)
        if (!open) reset()
      }}
    >
      <DialogContent className="max-w-[760px] gap-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-0 shadow-2xl dark:border-[#2d3431] dark:bg-[#111615]">
        <div className="border-b border-slate-200/70 px-5 py-4 dark:border-[#222826]">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-[#eef5f1]">新建组合策略</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
              可以直接新建 2 到 3 个策略工作区，也可以从现有单策略中选择后组成一个组合。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">组合名称</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：日内双策略"
              className="h-10 rounded-2xl"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                void create()
              }}
            />
          </div>

          <Tabs value={mode} onValueChange={setMode} className="gap-3">
            <TabsList className="h-9 rounded-2xl bg-slate-100 p-1 dark:bg-[#171d1b]">
              <TabsTrigger value="new" className="rounded-xl px-3 text-sm">
                新建工作区
              </TabsTrigger>
              <TabsTrigger value="pick" className="rounded-xl px-3 text-sm">
                选择已有单策略
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3">
              <div className="space-y-2">
                <Label>策略数量</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="h-10 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 个策略</SelectItem>
                    <SelectItem value="3">3 个策略</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-600 dark:bg-[#151a19] dark:text-[#97a39e]">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm dark:bg-[#1a211f] dark:text-[#dbe6e0] dark:shadow-none">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    将自动创建 <span className="font-medium text-slate-900 dark:text-[#eef5f1]">{name || "组合名称"}-1</span> 到{" "}
                    <span className="font-medium text-slate-900 dark:text-[#eef5f1]">{name || "组合名称"}-{count}</span> 的工作区，并初始化 Git。
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pick" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-900 dark:text-[#eef5f1]">选择已有单策略</div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-[#171d1b] dark:text-[#9eaba5]">
                  已选 {pick.length}/3，至少 2 个
                </div>
              </div>

              <div className="text-xs leading-5 text-slate-500 dark:text-[#839089]">
                只显示当前未被其他组合占用的单策略。
              </div>

              {free.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-[#2a312e] dark:bg-[#151a19] dark:text-[#8f9a95]">
                  当前没有可加入组合的单策略。
                </div>
              ) : (
                <div className="h-[340px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {free.map((item) => {
                      const hit = pick.includes(item.path)
                      return (
                        <button
                          key={item.path}
                          type="button"
                          className={cn(
                            "flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all",
                            hit
                              ? "border-slate-300 bg-slate-50 text-slate-900 ring-1 ring-slate-200 dark:border-[#55786b] dark:bg-[#1a2320] dark:text-[#e4eee8] dark:ring-[#355145]"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-[#2b312f] dark:bg-[#151a19] dark:text-[#d5dfda] dark:hover:border-[#3f514a] dark:hover:bg-[#1a201e]",
                          )}
                          onClick={() => toggle(item.path)}
                        >
                          <div
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                              hit
                                ? "border-slate-900 bg-slate-900 text-white dark:border-[#77a694] dark:bg-[#77a694] dark:text-[#09120f]"
                                : "border-slate-200 bg-slate-100 text-transparent dark:border-[#2d3431] dark:bg-[#1b2220]",
                            )}
                          >
                            <Check className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-slate-200/70 px-5 py-4 dark:border-[#222826]">
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void create()} disabled={busy || (mode === "pick" && pick.length < 2)}>
            {busy ? "创建中..." : "创建组合"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
