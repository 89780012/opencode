import { useMemo, useState, type ReactNode } from "react"
import { ChevronRight, Target } from "lucide-react"
import { toast } from "sonner"
import { chatApi, workspaceApi } from "@/api/modules"
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
import { buildStrategyPrompt, createGuide } from "@/lib/strategy-guide"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

const kinds = ["趋势", "均值回归", "突破", "网格", "套利", "自定义"]
const markets = ["加密", "股票", "ETF", "期货", "外汇"]
const tfs = ["1m", "5m", "15m", "1h", "4h", "1d"]
const sides = ["做多", "做空", "双向"]
const risks = ["控制回撤", "明确止损", "仓位管理", "减少频繁交易", "提升胜率"]
const outputs = ["策略说明", "可执行代码", "回测建议", "参数优化建议", "代码注释"]
const styles = ["保守", "平衡", "激进"]
const steps = ["命名", "画像", "确认"]

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
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
        <div className="text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-[#eef5f1]">{props.title}</div>
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

export function WorkspaceCreateDialog(props: Props) {
  const { basePath, refresh, select } = useWorkspaceList()
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
  const [guide, setGuide] = useState(createGuide)
  const [prompt, setPrompt] = useState("")
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

  const reset = () => {
    setStep(0)
    setPanel("base")
    setName("")
    setGuide(createGuide())
    setPrompt("")
  }

  const next = () => {
    if (step === 0 && !name.trim()) {
      toast.error("请输入策略名称")
      return
    }
    if (step === 1) {
      setPrompt(buildStrategyPrompt({ name: name.trim(), guide }))
    }
    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const create = async () => {
    const value = name.trim()
    if (!value) {
      toast.error("请输入策略名称")
      return
    }
    if (!composer.agent || !composer.model) {
      toast.error("当前没有可用的模型或模式，无法自动发起引导会话")
      return
    }

    setBusy(true)
    try {
      const data = await workspaceApi.createWorkspace(value)
      const ws = await workspaceApi.openWorkspace(data.workspace.path)
      await refresh()
      select(ws.workspace)

      const session = await chatApi.createSession(ws.workspace.path)
      await chatApi.sendPrompt(ws.workspace.path, session.id, {
        agent: composer.agent.name,
        model: composer.model,
        variant: composer.variant,
        parts: [
          {
            type: "text",
            text: prompt || buildStrategyPrompt({ name: value, guide }),
          },
        ],
      })

      props.onDone?.()
      props.onOpenChange(false)
      reset()
      toast.success(`策略已创建并发起引导：${data.workspace.name}`)
    } catch (err) {
      console.error("Failed to create workspace", err)
      toast.error(note(err, "创建策略失败"))
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
      <DialogContent className="flex h-[min(760px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] w-[min(780px,calc(100vw-24px))] max-w-[1240px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[#fcfcfa] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.14)] dark:border-[#252e2b] dark:bg-[#101514]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.94))] px-5 py-4 dark:border-[#202725] dark:bg-[radial-gradient(circle_at_top_left,rgba(122,165,144,0.2),transparent_32%),linear-gradient(180deg,rgba(17,22,21,0.98),rgba(15,20,19,0.95))]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <DialogHeader className="gap-1 text-left">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-700/80 dark:text-[#8eb7a5]">
                Strategy Lab
              </div>
              <DialogTitle className="text-[22px] font-semibold tracking-[0.01em] text-slate-900 dark:text-[#eef5f1]">
                创建单策略
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
                先梳理策略方向，再由 AI 自动开启首轮研发，会更像一次完整的策略立项。
              </DialogDescription>
            </DialogHeader>
            <div className="hidden rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[11px] text-emerald-800 shadow-sm backdrop-blur md:block dark:border-[#355145] dark:bg-[#141b19] dark:text-[#a7c5b9]">
              引导式创建
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
              <Block title="策略名称" hint="用于工作区与默认会话名称">
                <Label htmlFor="workspace-name">策略名称</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：5分钟趋势突破"
                  className="mt-2 h-11 rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 placeholder:text-slate-400 focus-visible:ring-emerald-300 dark:bg-[#141918] dark:ring-[#2d3733] dark:placeholder:text-[#60706a] dark:focus-visible:ring-[#4e6d61]"
                />
              </Block>
              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.8))] px-4 py-3 text-sm leading-6 text-emerald-950/80 dark:border-[#29443b] dark:bg-[linear-gradient(180deg,rgba(20,33,28,0.95),rgba(17,22,21,0.95))] dark:text-[#a7c3b8]">
                  创建后会自动初始化工作区、打开首个会话，并把你的策略引导词直接提交给 AI。
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-500 dark:border-[#26302c] dark:bg-[#141918] dark:text-[#83928c]">
                  工作区目录
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-[#eef5f1]">
                    {basePath || "~/.xtp-smart/plugins"}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <Tabs value={panel} onValueChange={setPanel} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-[#26302c] dark:bg-[#141918]">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">第二步：补齐策略画像</div>
                  <div className="text-xs text-slate-500 dark:text-[#809088]">
                    {panel === "base"
                      ? "先确定基础交易参数，再补充风险与输出要求。"
                      : "这一页用于明确风控偏好、输出形式和额外约束。"}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-[#355145] dark:bg-[#17211d] dark:text-[#a8c6bb]">
                  当前：
                  {panel === "base"
                    ? `${guide.kind} / ${guide.market} / ${guide.tf}`
                    : `${guide.style} / ${guide.output.length}项输出`}
                </div>
              </div>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-slate-100/90 p-1 dark:bg-[#171d1b]">
                <TabsTrigger value="base" className="rounded-xl px-3 text-sm">
                  基础参数
                </TabsTrigger>
                <TabsTrigger value="goal" className="rounded-xl px-3 text-sm">
                  风控与输出
                </TabsTrigger>
              </TabsList>
              <TabsContent value="base" className="space-y-4">
                <Block title="策略方向" hint="先给出基本框架">
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
                <div className="grid gap-4 xl:grid-cols-3">
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
                </div>
              </TabsContent>
              <TabsContent value="goal" className="space-y-4">
                <Block title="风控重点" hint="告诉 AI 你最在意什么">
                  <div className="flex flex-wrap gap-2">
                    {risks.map((item) => (
                      <Chip
                        key={item}
                        text={item}
                        active={guide.risk.includes(item)}
                        onClick={() => setGuide((prev) => ({ ...prev, risk: toggle(prev.risk, item) }))}
                      />
                    ))}
                  </div>
                </Block>
                <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
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
                  <Block title="输出要求">
                    <div className="flex flex-wrap gap-2">
                      {outputs.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.output.includes(item)}
                          onClick={() => setGuide((prev) => ({ ...prev, output: toggle(prev.output, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                </div>
                <Block title="补充说明" hint="写下额外目标、技术偏好或限制">
                  <div className="rounded-[20px] bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={guide.note}
                      onChange={(value) => setGuide((prev) => ({ ...prev, note: value }))}
                      height={160}
                      placeholder="例如：优先给出 Pine Script 版本，并解释参数选择原因。"
                    />
                  </div>
                </Block>
              </TabsContent>
            </Tabs>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 dark:border-[#26302c] dark:bg-[linear-gradient(180deg,rgba(21,26,25,0.98),rgba(17,22,21,0.94))]">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                    <Target className="size-4" />
                    当前策略画像
                  </div>
                  <div className="mb-4 grid gap-3">
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
                  <div className="space-y-2 text-sm text-slate-600 dark:text-[#9aaba4]">
                    <div>类型：{guide.kind}</div>
                    <div>市场：{guide.market}</div>
                    <div>周期：{guide.tf}</div>
                    <div>方向：{guide.side}</div>
                    <div>风控：{guide.risk.join("、")}</div>
                    <div>风格：{guide.style}</div>
                    <div>输出：{guide.output.join("、")}</div>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.84))] px-3 py-2 text-xs leading-6 text-emerald-950/80 dark:border-[#29443b] dark:bg-[linear-gradient(180deg,rgba(20,33,28,0.95),rgba(17,22,21,0.95))] dark:text-[#a7c3b8]">
                    将使用 <span className="font-medium">{composer.agent?.name ?? "未选择模式"}</span> 与{" "}
                    <span className="font-medium">
                      {composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : "未选择模型"}
                    </span>{" "}
                    自动发起首轮开发。
                  </div>
                </div>
                <Block title="首条引导消息" hint="可以直接改成你希望 AI 立刻执行的任务">
                  <div className="rounded-[20px] bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={prompt}
                      onChange={setPrompt}
                      height={280}
                      placeholder="这里会自动生成引导消息，你也可以手动调整。"
                    />
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
