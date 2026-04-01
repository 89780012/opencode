import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ChevronRight, Layers3, Radar } from "lucide-react"
import { toast } from "sonner"
import { chatApi, groupApi } from "@/api/modules"
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
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAgentList, useProviderList, useWorkspaceList } from "@/data/global-data-provider"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"
import { buildGroupRoles, buildStrategyPrompt, createGuide, type GroupMode } from "@/lib/strategy-guide"
import { cn } from "@/lib/utils"
import type { StrategyGroup } from "@/types/group"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: (group: StrategyGroup) => void
  redirect?: boolean
  occupied: string[]
}

const kinds = ["趋势", "均值回归", "突破", "网格", "套利", "自定义"]
const markets = ["加密", "股票", "ETF", "期货", "外汇"]
const tfs = ["1m", "5m", "15m", "1h", "4h", "1d"]
const sides = ["做多", "做空", "双向"]
const styles = ["保守", "平衡", "激进"]
const steps = ["组合", "拆解", "确认"]

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function Chip(props: { active: boolean; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={
        props.active
          ? "rounded-full border border-emerald-500/30 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors dark:border-[#7aa590] dark:bg-[#7aa590] dark:text-[#08110e]"
          : "rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-slate-900 dark:border-[#26302c] dark:bg-[#131817] dark:text-[#b8c5bf] dark:hover:border-[#395247] dark:hover:bg-[#18201d] dark:hover:text-[#edf3ef]"
      }
      onClick={props.onClick}
    >
      {props.text}
    </button>
  )
}

function Block(props: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[24px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 dark:border-[#26302c] dark:bg-[linear-gradient(180deg,rgba(21,26,25,0.98),rgba(17,22,21,0.94))] ${
        props.className ?? ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">{props.title}</div>
        {props.hint ? <div className="text-[11px] text-slate-500 dark:text-[#809088]">{props.hint}</div> : null}
      </div>
      {props.children}
    </section>
  )
}

function Dot(props: { active: boolean; done: boolean; text: string; step: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          props.active || props.done
            ? "flex size-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-[#7aa590] dark:text-[#08110e]"
            : "flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 dark:bg-[#1a211f] dark:text-[#77827d]"
        }
      >
        {props.step}
      </div>
      <div
        className={
          props.active || props.done
            ? "text-sm font-medium text-slate-900 dark:text-[#eef5f1]"
            : "text-sm text-slate-500 dark:text-[#77827d]"
        }
      >
        {props.text}
      </div>
    </div>
  )
}

export function GroupCreateDialog(props: Props) {
  const nav = useNavigate()
  const { refresh, workspaces } = useWorkspaceList()
  const ags = useAgentList()
  const catalog = useProviderList()
  const project = useProjectComposer()
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  const [step, setStep] = useState(0)
  const [panel, setPanel] = useState("base")
  const [name, setName] = useState("")
  const [count, setCount] = useState("2")
  const [source, setSource] = useState("new")
  const [pick, setPick] = useState<string[]>([])
  const [mode, setMode] = useState<GroupMode>("split")
  const [guide, setGuide] = useState(createGuide)
  const [prompts, setPrompts] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : ""

  const setAgent = (value: string) => {
    if (!ags.ags.some((item) => item.name === value)) return
    project.setAgent(value)
  }

  const setModel = (value: string) => {
    const [providerID, ...rest] = value.split("/")
    const modelID = rest.join("/")
    if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) return
    project.setModel({ providerID, modelID })
  }

  const free = useMemo(() => {
    const taken = new Set(props.occupied)
    return [...workspaces]
      .filter((item) => !taken.has(item.path))
      .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
  }, [props.occupied, workspaces])

  const total = source === "pick" ? pick.length : Number(count)

  const reset = () => {
    setStep(0)
    setPanel("base")
    setName("")
    setCount("2")
    setSource("new")
    setPick([])
    setMode("split")
    setGuide(createGuide())
    setPrompts([])
  }

  const toggle = (path: string) => {
    setPick((prev) => {
      if (prev.includes(path)) return prev.filter((item) => item !== path)
      if (prev.length >= 3) return prev
      return [...prev, path]
    })
  }

  const buildPrompts = () => {
    const roles = buildGroupRoles(mode, total)
    setPrompts(
      roles.map((role, i) =>
        buildStrategyPrompt({
          name:
            source === "pick"
              ? (free.find((item) => item.path === pick[i])?.name ?? `${name}-${i + 1}`)
              : `${name}-${i + 1}`,
          guide,
          role,
          peers: roles.filter((_, at) => at !== i),
        }),
      ),
    )
  }

  const next = () => {
    if (step === 0) {
      if (!name.trim()) {
        toast.error("请输入组合策略名称")
        return
      }
      if (source === "pick" && (pick.length < 2 || pick.length > 3)) {
        toast.error("请选择 2 到 3 个单策略")
        return
      }
    }
    if (step === 1) buildPrompts()
    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const create = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("请输入组合策略名称")
      return
    }
    if (!composer.agent || !composer.model) {
      toast.error("当前没有可用的模型或模式，无法自动发起引导会话")
      return
    }

    setBusy(true)
    try {
      const data = await groupApi.create(value, total, source === "pick" ? pick : undefined)
      await refresh()

      for (let i = 0; i < data.group.items.length; i++) {
        const item = data.group.items[i]
        const session = await chatApi.createSession(item.workspace.path)
        await chatApi.sendPrompt(item.workspace.path, session.id, {
          agent: composer.agent.name,
          model: composer.model,
          variant: composer.variant,
          parts: [
            {
              type: "text",
              text: prompts[i] ?? buildStrategyPrompt({ name: item.workspace.name, guide }),
            },
          ],
        })
      }

      props.onDone?.(data.group)
      props.onOpenChange(false)
      reset()
      toast.success(`组合策略已创建并发起引导：${data.group.name}`)
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
      <DialogContent className="flex h-[min(780px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] w-[min(780px,calc(100vw-24px))] max-w-[1320px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[#fcfcfa] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.14)] dark:border-[#252e2b] dark:bg-[#101514]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.94))] px-5 py-4 dark:border-[#202725] dark:bg-[radial-gradient(circle_at_top_left,rgba(122,165,144,0.2),transparent_32%),linear-gradient(180deg,rgba(17,22,21,0.98),rgba(15,20,19,0.95))]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <DialogHeader className="gap-1 text-left">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-700/80 dark:text-[#8eb7a5]">
                Strategy Lab
              </div>
              <DialogTitle className="text-[22px] font-semibold tracking-[0.01em] text-slate-900 dark:text-[#eef5f1]">
                创建组合策略
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
                用一个引导流程把多屏策略的分工、协作方式和首轮任务一次定清楚。
              </DialogDescription>
            </DialogHeader>
            <div className="hidden rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[11px] text-emerald-800 shadow-sm backdrop-blur md:block dark:border-[#355145] dark:bg-[#141b19] dark:text-[#a7c5b9]">
              多屏协同
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((item, i) => (
              <div key={item} className="flex items-center gap-2">
                <Dot active={i === step} done={i < step} text={item} step={i + 1} />
                {i < steps.length - 1 ? <ChevronRight className="size-4 text-slate-300 dark:text-[#31403b]" /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 0 ? (
            <div className="space-y-4">
              <Block title="组合命名" hint="会作为组合视图和会话主题">
                <Label htmlFor="group-name">组合名称</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：日内双策略"
                  className="mt-2 h-11 rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 placeholder:text-slate-400 focus-visible:ring-emerald-300 dark:bg-[#141918] dark:ring-[#2d3733] dark:placeholder:text-[#60706a] dark:focus-visible:ring-[#4e6d61]"
                />
              </Block>
              <Tabs value={source} onValueChange={setSource} className="gap-3">
                <TabsList className="h-10 rounded-2xl bg-slate-100/90 p-1 dark:bg-[#171d1b]">
                  <TabsTrigger value="new" className="rounded-xl px-3 text-sm">
                    新建工作区
                  </TabsTrigger>
                  <TabsTrigger value="pick" className="rounded-xl px-3 text-sm">
                    选择已有单策略
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="new" className="space-y-4">
                  <Block title="组合规模" hint="决定会拆成几个策略位">
                    <Select value={count} onValueChange={setCount}>
                      <SelectTrigger className="h-11 rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 个策略</SelectItem>
                        <SelectItem value="3">3 个策略</SelectItem>
                      </SelectContent>
                    </Select>
                  </Block>
                </TabsContent>
                <TabsContent value="pick" className="space-y-4">
                  <Block title="选择已有单策略" hint={`已选 ${pick.length}/3，至少 2 个`}>
                    <div className="max-h-[340px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                        {free.map((item) => {
                          const hit = pick.includes(item.path)
                          return (
                            <button
                              key={item.path}
                              type="button"
                              className={cn(
                                "flex min-w-0 items-center gap-2 rounded-[20px] border px-3 py-2.5 text-left transition-all",
                                hit
                                  ? "border-emerald-200 bg-emerald-50/70 text-slate-900 ring-1 ring-emerald-100 dark:border-[#55786b] dark:bg-[#1a2320] dark:text-[#e4eee8] dark:ring-[#355145]"
                                  : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-[#2b312f] dark:bg-[#151a19] dark:text-[#d5dfda] dark:hover:border-[#3f514a] dark:hover:bg-[#1a201e]",
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
                  </Block>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}

          {step === 1 ? (
            <Tabs value={panel} onValueChange={setPanel} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-[#26302c] dark:bg-[#141918]">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                    第二步：确定组合协作方式
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#809088]">
                    {panel === "base"
                      ? "先定义多屏之间的分工，再确定基础市场参数。"
                      : "这一页用于补充组合协作说明，帮助 AI 理解多屏关系。"}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-[#355145] dark:bg-[#17211d] dark:text-[#a8c6bb]">
                  当前：
                  {panel === "base"
                    ? `${mode === "split" ? "拆分职责" : "多思路并行"} / ${guide.market} / ${guide.tf}`
                    : `已填写${guide.note.trim() ? "组合说明" : "说明待补充"}`}
                </div>
              </div>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-slate-100/90 p-1 dark:bg-[#171d1b]">
                <TabsTrigger value="base" className="rounded-xl px-3 text-sm">
                  协作参数
                </TabsTrigger>
                <TabsTrigger value="note" className="rounded-xl px-3 text-sm">
                  组合说明
                </TabsTrigger>
              </TabsList>
              <TabsContent value="base" className="space-y-4">
                <Block title="协作模式" hint="决定每个子策略的工作关系">
                  <div className="flex flex-wrap gap-2">
                    <Chip text="拆分职责" active={mode === "split"} onClick={() => setMode("split")} />
                    <Chip text="多思路并行" active={mode === "parallel"} onClick={() => setMode("parallel")} />
                  </div>
                </Block>
                <div className="grid gap-4 md:grid-cols-3">
                  <Block title="策略类型">
                    <div className="flex flex-wrap gap-2">
                      {kinds.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.kind === item}
                          onClick={() => setGuide((prev) => ({ ...prev, kind: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="市场">
                    <div className="flex flex-wrap gap-2">
                      {markets.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.market === item}
                          onClick={() => setGuide((prev) => ({ ...prev, market: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="周期">
                    <div className="flex flex-wrap gap-2">
                      {tfs.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.tf === item}
                          onClick={() => setGuide((prev) => ({ ...prev, tf: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Block title="方向">
                    <div className="flex flex-wrap gap-2">
                      {sides.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.side === item}
                          onClick={() => setGuide((prev) => ({ ...prev, side: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="开发风格">
                    <div className="flex flex-wrap gap-2">
                      {styles.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.style === item}
                          onClick={() => setGuide((prev) => ({ ...prev, style: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                </div>
              </TabsContent>
              <TabsContent value="note" className="space-y-4">
                <Block title="组合说明" hint="告诉 AI 这一组策略要如何配合">
                  <div className="rounded-[20px] bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={guide.note}
                      onChange={(value) => setGuide((prev) => ({ ...prev, note: value }))}
                      height={220}
                      placeholder="例如：希望三屏分别承担主策略、风控优化、信号过滤，最后便于横向比较。"
                    />
                  </div>
                </Block>
              </TabsContent>
            </Tabs>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <Block title="自动发起配置" hint="创建后会按这里的模式与模型启动多屏会话">
                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="space-y-2">
                        <Label>使用模式</Label>
                        <Select value={composer.agent?.name} onValueChange={setAgent}>
                          <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                            <SelectValue placeholder="选择模式" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                            {ags.ags.map((item) => (
                              <SelectItem key={item.name} value={item.name}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>使用模型</Label>
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                            {catalog.connectedModels.map((item) => {
                              const value = `${item.provider.id}/${item.id}`
                              return (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Block>
                  <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 dark:border-[#26302c] dark:bg-[linear-gradient(180deg,rgba(21,26,25,0.98),rgba(17,22,21,0.94))]">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                      <Layers3 className="size-4" />
                      组合分工
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-[#9aaba4]">
                      {buildGroupRoles(mode, total).map((item, i) => (
                        <div
                          key={item}
                          className="flex items-center justify-between gap-3 rounded-[18px] bg-white/80 px-3 py-2 dark:bg-[#161b1a]"
                        >
                          <span>{item}</span>
                          <span className="text-xs text-slate-400 dark:text-[#73827c]">策略 {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.84))] p-4 text-sm leading-6 text-emerald-950/80 dark:border-[#29443b] dark:bg-[linear-gradient(180deg,rgba(20,33,28,0.95),rgba(17,22,21,0.95))] dark:text-[#a7c3b8]">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <Radar className="size-4" />
                      自动发起模型
                    </div>
                    使用{" "}
                    <span className="font-medium text-slate-900 dark:text-[#eef5f1]">
                      {composer.agent?.name ?? "未选择模式"}
                    </span>{" "}
                    和{" "}
                    <span className="font-medium text-slate-900 dark:text-[#eef5f1]">
                      {composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : "未选择模型"}
                    </span>{" "}
                    为每个子策略独立创建会话。
                  </div>
                </div>
                <Block title="每一屏的首条引导消息" hint="可以微调每个子策略的任务描述">
                  <div className="space-y-3">
                    {prompts.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <Label>{buildGroupRoles(mode, total)[i] ?? `策略 ${i + 1}`}</Label>
                        <div className="rounded-[20px] bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                          <AutoResizeTextarea
                            value={item}
                            onChange={(value) => {
                              setPrompts((prev) => prev.map((row, at) => (at === i ? value : row)))
                            }}
                            height={180}
                            placeholder="这里会自动生成每一屏的引导提示词。"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Block>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(249,250,251,0.7),rgba(255,255,255,0.92))] px-5 py-4 dark:border-[#202725] dark:bg-[linear-gradient(180deg,rgba(16,21,20,0.8),rgba(16,21,20,0.96))]">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200/80 bg-white/90 shadow-none dark:border-[#2c3532] dark:bg-[#151918]"
            onClick={() => (step === 0 ? props.onOpenChange(false) : setStep((prev) => prev - 1))}
            disabled={busy}
          >
            {step === 0 ? "取消" : "上一步"}
          </Button>
          {step < 2 ? (
            <Button
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
              onClick={next}
              disabled={busy}
            >
              下一步
            </Button>
          ) : (
            <Button
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy ? "创建中..." : "创建并自动发起"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
