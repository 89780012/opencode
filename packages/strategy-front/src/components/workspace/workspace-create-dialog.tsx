import { useMemo, useState, type ReactNode } from "react"
import { ChevronRight, Code2, Cpu, Target } from "lucide-react"
import { useNavigate } from "react-router-dom"
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
import { buildStrategyPrompt, buildTemplatePrompt, createGuide, type StrategyType } from "@/lib/strategy-guide"
import { encodeStrategyPath } from "@/lib/strategy-path"

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
const steps = ["类型", "配置", "确认"]

const cards: Record<
  StrategyType,
  {
    title: string
    desc: string
    template: string
    icon: ReactNode
  }
> = {
  smartx: {
    title: "SmartX 策略",
    desc: "沿用现有 SmartX 插件模板，适合当前策略研发流程。",
    template: "smartx_plugin_python",
    icon: <Target className="size-4" />,
  },
  python: {
    title: "Python 策略",
    desc: "创建一个轻量 Python 模板工作区，进入后也可以继续聊天改代码。",
    template: "python_basic",
    icon: <Cpu className="size-4" />,
  },
  js: {
    title: "JS 策略",
    desc: "创建一个轻量 JavaScript 模板工作区，进入后也可以继续聊天改代码。",
    template: "js_basic",
    icon: <Code2 className="size-4" />,
  },
}

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
          ? "rounded-full border border-emerald-500/30 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
          : "rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-slate-900 dark:border-[#26302c] dark:bg-[#131817] dark:text-[#b8c5bf] dark:hover:border-[#395247] dark:hover:bg-[#18201d] dark:hover:text-[#edf3ef]"
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

export function WorkspaceCreateDialog(props: Props) {
  const nav = useNavigate()
  const { basePath, refresh, select } = useWorkspaceList()
  const [kind, setKind] = useState<StrategyType>("smartx")
  const ags = useAgentList(kind)
  const catalog = useProviderList()
  const project = useProjectComposer(kind)
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
  const [brief, setBrief] = useState("")
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
    setKind("smartx")
    setName("")
    setGuide(createGuide())
    setBrief("")
    setPrompt("")
  }

  const template = cards[kind].template

  const buildPrompt = () => {
    const base =
      kind === "smartx"
        ? buildStrategyPrompt({ name: name.trim(), guide })
        : buildTemplatePrompt({ name: name.trim(), type: kind })
    if (!brief.trim()) {
      return base
    }
    return `${base}\n补充说明：${brief.trim()}`
  }

  const next = () => {
    if (!name.trim()) {
      toast.error("请输入策略名称")
      return
    }
    if (step === 1) {
      setPrompt(buildPrompt())
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
      const data = await workspaceApi.createWorkspace(value, kind, template)
      await refresh()
      select(data.workspace)

      const session = await chatApi.createSession(data.workspace.path)
      await chatApi.sendPrompt(data.workspace.path, session.id, {
        agent: composer.agent.name,
        model: composer.model,
        variant: composer.variant,
        parts: [
          {
            type: "text",
            text: prompt || buildPrompt(),
          },
        ],
      })

      props.onDone?.()
      props.onOpenChange(false)
      reset()
      toast.success(`策略已创建并发起引导：${data.workspace.name}`)
      nav(`/app/strategies/${encodeStrategyPath(data.workspace.path)}`)
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
                新建策略
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
                先选择策略类型，再生成工作区并自动进入首轮聊天改代码。
              </DialogDescription>
            </DialogHeader>
            <div className="hidden rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[11px] text-emerald-800 shadow-sm backdrop-blur md:block dark:border-[#355145] dark:bg-[#141b19] dark:text-[#a7c5b9]">
              类型化创建
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
              <Block title="策略名称" hint="用于工作区目录和默认会话标题">
                <Label htmlFor="workspace-name">策略名称</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：分钟级趋势突破"
                  className="mt-2 h-11 rounded-2xl border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 placeholder:text-slate-400 focus-visible:ring-emerald-300 dark:bg-[#141918] dark:ring-[#2d3733] dark:placeholder:text-[#60706a] dark:focus-visible:ring-[#4e6d61]"
                />
              </Block>

              <Block title="策略类型" hint="不同类型会加载不同模板与 agent">
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(cards).map(([key, item]) => {
                    const active = kind === key
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`rounded-[22px] border px-4 py-4 text-left transition-all ${
                          active
                            ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100 dark:border-[#4d6f62] dark:bg-[#15201c] dark:ring-[#30453d]"
                            : "border-slate-200/80 bg-white/90 hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-[#26302c] dark:bg-[#141918] dark:hover:border-[#355145] dark:hover:bg-[#18201d]"
                        }`}
                        onClick={() => setKind(key as StrategyType)}
                      >
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                          {item.icon}
                          {item.title}
                        </div>
                        <div className="text-xs leading-5 text-slate-600 dark:text-[#93a39c]">{item.desc}</div>
                        <div className="mt-3 text-[11px] text-slate-500 dark:text-[#809088]">模板：{item.template}</div>
                      </button>
                    )
                  })}
                </div>
              </Block>

              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.8))] px-4 py-3 text-sm leading-6 text-emerald-950/80 dark:border-[#29443b] dark:bg-[linear-gradient(180deg,rgba(20,33,28,0.95),rgba(17,22,21,0.95))] dark:text-[#a7c3b8]">
                  创建后会自动初始化模板、创建首个会话，并直接跳转到策略详情页继续聊天改代码。
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
            kind === "smartx" ? (
              <Tabs value={panel} onValueChange={setPanel} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-[#26302c] dark:bg-[#141918]">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">补齐策略画像</div>
                    <div className="text-xs text-slate-500 dark:text-[#809088]">
                      SmartX 策略继续使用当前引导式表单，便于首轮生成更完整的策略方案。
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-[#355145] dark:bg-[#17211d] dark:text-[#a8c6bb]">
                    {guide.kind} / {guide.market} / {guide.tf}
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
                  <Block title="策略方向">
                    <div className="flex flex-wrap gap-2">
                      {kinds.map((item) => (
                        <Chip key={item} text={item} active={guide.kind === item} onClick={() => setGuide((prev) => ({ ...prev, kind: item }))} />
                      ))}
                    </div>
                  </Block>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Block title="市场">
                      <div className="flex flex-wrap gap-2">
                        {markets.map((item) => (
                          <Chip key={item} text={item} active={guide.market === item} onClick={() => setGuide((prev) => ({ ...prev, market: item }))} />
                        ))}
                      </div>
                    </Block>
                    <Block title="周期">
                      <div className="flex flex-wrap gap-2">
                        {tfs.map((item) => (
                          <Chip key={item} text={item} active={guide.tf === item} onClick={() => setGuide((prev) => ({ ...prev, tf: item }))} />
                        ))}
                      </div>
                    </Block>
                    <Block title="方向">
                      <div className="flex flex-wrap gap-2">
                        {sides.map((item) => (
                          <Chip key={item} text={item} active={guide.side === item} onClick={() => setGuide((prev) => ({ ...prev, side: item }))} />
                        ))}
                      </div>
                    </Block>
                  </div>
                </TabsContent>
                <TabsContent value="goal" className="space-y-4">
                  <Block title="风控重点">
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
                          <Chip key={item} text={item} active={guide.style === item} onClick={() => setGuide((prev) => ({ ...prev, style: item }))} />
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
                  <Block title="补充说明" hint="附加限制、目标或偏好">
                    <div className="rounded-[20px] bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={guide.note}
                        onChange={(value) => setGuide((prev) => ({ ...prev, note: value }))}
                        height={160}
                        placeholder="例如：优先给出稳健版本，并说明参数选择依据。"
                      />
                    </div>
                  </Block>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <Block title="模板说明" hint={`当前模板：${template}`}>
                  <div className="text-sm leading-6 text-slate-600 dark:text-[#93a39c]">
                    {kind === "python"
                      ? "Python 策略会先创建一个简单的 `main.py` 模板，并自动发起一轮聊天，让 AI 继续扩展项目结构和实现代码。"
                      : "JS 策略会先创建一个简单的 `index.js` 模板，并自动发起一轮聊天，让 AI 继续扩展项目结构和实现代码。"}
                  </div>
                </Block>
                <Block title="补充说明" hint="描述你希望首轮重点完成的内容">
                  <div className="rounded-[20px] bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={brief}
                      onChange={setBrief}
                      height={220}
                      placeholder={kind === "python" ? "例如：先搭一个可扩展的 Python 策略骨架，并预留参数配置。"
                        : "例如：先搭一个可扩展的 JS 策略骨架，并预留信号处理与执行入口。"}
                    />
                  </div>
                </Block>
              </div>
            )
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 dark:border-[#26302c] dark:bg-[linear-gradient(180deg,rgba(21,26,25,0.98),rgba(17,22,21,0.94))]">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                    {cards[kind].icon}
                    当前创建配置
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
                    <div>类型：{cards[kind].title}</div>
                    <div>模板：{template}</div>
                    <div>名称：{name || "-"}</div>
                    {kind === "smartx" ? (
                      <>
                        <div>方向：{guide.kind}</div>
                        <div>市场：{guide.market}</div>
                        <div>周期：{guide.tf}</div>
                        <div>交易方向：{guide.side}</div>
                      </>
                    ) : null}
                  </div>
                </div>
                <Block title="首条引导消息" hint="创建后会自动发送到首个会话">
                  <div className="rounded-[20px] bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={prompt}
                      onChange={setPrompt}
                      height={280}
                      placeholder="这里会自动生成引导消息，你也可以继续调整。"
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
              {busy ? "创建中..." : "创建并进入策略页"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
