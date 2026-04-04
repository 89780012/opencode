import { useMemo, useState, type ReactNode } from "react"
import { ChevronRight, Code2, Cpu, FileText, RefreshCw, Target } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { chatApi, workspaceApi } from "@/api/modules"
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea"
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

const kinds = ["趋势", "均值回归", "突破", "轮动", "网格", "配对", "事件驱动", "自定义"]
const markets = ["股票", "ETF", "期货", "外汇", "加密"]
const pools = ["全市场", "沪深 300", "中证 500", "创业板", "ETF 池", "自选池"]
const tfs = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
const sides = ["做多", "做空", "双向"]
const holds = ["日内", "隔夜", "波段", "中长线"]
const sources = ["价格行为", "成交量", "技术指标", "多因子", "基本面", "盘口结构"]
const factors = ["MA", "EMA", "MACD", "RSI", "KDJ", "Bollinger", "ATR", "VWAP", "Donchian", "ADX"]
const filters = ["成交量过滤", "波动率过滤", "大盘趋势过滤", "时间窗口过滤", "财报日过滤", "流动性过滤"]
const entries = ["均线金叉", "突破近期高点", "RSI 超卖反弹", "放量确认", "多条件共振", "回踩支撑入场"]
const exits = ["固定止盈", "固定止损", "移动止损", "反向信号离场", "跌破慢线离场", "持仓超时退出"]
const risks = ["控制回撤", "明确止损", "仓位管理", "减少频繁交易", "限制单日亏损", "限制连亏"]
const stops = ["固定止损", "移动止损", "分批止盈", "时间止损", "盈亏比约束"]
const poses = ["固定资金仓位", "固定风险仓位", "波动率仓位", "分批建仓", "金字塔加仓"]
const limits = ["手续费", "滑点", "股票 T+1", "涨跌停约束", "最小成交量", "避免集合竞价"]
const outputs = ["策略说明", "可执行代码", "回测建议", "参数优化建议", "风险说明", "README", "代码注释"]
const styles = ["保守", "平衡", "激进"]
const steps = ["类型", "配置", "确认"]

const cards: Record<StrategyType, { title: string; desc: string; template: string; icon: ReactNode; root: string }> = {
  smartx: {
    title: "SmartX 策略",
    desc: "适合直接落地成可运行策略工程。",
    template: "smartx_plugin_python",
    icon: <Target className="size-4" />,
    root: "~/.xtp-smart/plugins",
  },
  python: {
    title: "Python 策略",
    desc: "适合研究、回测与快速迭代, 不依赖SmartX。",
    template: "python_basic",
    icon: <Cpu className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
  js: {
    title: "JS 策略",
    desc: "适合脚手架、信号实验与服务集成,不依赖SmartX。",
    template: "js_basic",
    icon: <Code2 className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
  other: {
    title: "其他",
    desc: "空白项目目录",
    template: "other_basic",
    icon: <FileText className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function tail() {
  return Math.random().toString(36).slice(2, 8)
}

function text(list: string[]) {
  return list.length > 0 ? list.join(" / ") : "-"
}

function Chip(props: { active: boolean; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={
        props.active
          ? "rounded-full border border-emerald-500/30 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
          : "rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-slate-900 dark:border-[#26302c] dark:bg-[#131817] dark:text-[#b8c5bf]"
      }
      onClick={props.onClick}
    >
      {props.text}
    </button>
  )
}

function Block(props: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 dark:border-[#26302c] dark:bg-[linear-gradient(180deg,rgba(21,26,25,0.98),rgba(17,22,21,0.94))]">
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
  const { refresh, select } = useWorkspaceList()
  const [kind, setKind] = useState<StrategyType>("smartx")
  const ags = useAgentList(kind)
  const catalog = useProviderList()
  const project = useProjectComposer(kind)
  const composer = useMemo(
    () => resolveComposer({ agents: ags.ags, catalog, state: project.state }),
    [ags.ags, catalog, project.state],
  )
  const [step, setStep] = useState(0)
  const [panel, setPanel] = useState("market")
  const [name, setName] = useState("")
  const [tailname, setTailname] = useState(() => tail())
  const [guide, setGuide] = useState(createGuide)
  const [brief, setBrief] = useState("")
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : ""
  const card = cards[kind]
  const full = name.trim() ? `${name.trim()}-${tailname.trim()}` : ""
  const rich = kind !== "other"

  const reset = () => {
    setStep(0)
    setPanel("market")
    setKind("smartx")
    setName("")
    setTailname(tail())
    setGuide(createGuide())
    setBrief("")
    setPrompt("")
  }

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

  const buildPrompt = () => {
    if (kind === "other") {
      return brief.trim() ? `补充说明：${brief.trim()}` : ""
    }
    if (kind === "smartx") {
      const base = buildStrategyPrompt({ name: full, guide, type: "smartx" })
      return brief.trim() ? `${base}\n额外要求：${brief.trim()}` : base
    }
    return buildTemplatePrompt({ name: full, type: kind, guide, brief })
  }

  const next = () => {
    if (!name.trim()) {
      toast.error("请输入策略名称")
      return
    }
    if (step === 1) setPrompt(buildPrompt())
    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const create = async () => {
    if (!full) {
      toast.error("请输入策略名称")
      return
    }
    if (!composer.agent || !composer.model) {
      toast.error("当前没有可用的模型或模式，无法自动发起引导会话")
      return
    }
    setBusy(true)
    try {
      const data = await workspaceApi.createWorkspace(full, kind, card.template)
      await refresh()
      select(data.workspace)
      const session = await chatApi.createSession(data.workspace.path)
      await chatApi.sendPrompt(data.workspace.path, session.id, {
        agent: composer.agent.name,
        model: composer.model,
        variant: composer.variant,
        parts: [{ type: "text", text: prompt || buildPrompt() }],
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
      <DialogContent className="flex h-[min(760px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] w-[min(820px,calc(100vw-24px))] max-w-[1240px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[#fcfcfa] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.14)] dark:border-[#252e2b] dark:bg-[#101514]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.94))] px-5 py-4 dark:border-[#202725] dark:bg-[radial-gradient(circle_at_top_left,rgba(122,165,144,0.2),transparent_32%),linear-gradient(180deg,rgba(17,22,21,0.98),rgba(15,20,19,0.95))]">
          <DialogHeader className="mb-3 gap-1 text-left">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-700/80 dark:text-[#8eb7a5]">
              Strategy Lab
            </div>
            <DialogTitle className="text-[22px] font-semibold tracking-[0.01em] text-slate-900 dark:text-[#eef5f1]">
              新建策略
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
              先选择模板，再补齐市场、指标、规则、风控与输出要求。
            </DialogDescription>
          </DialogHeader>
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
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <Input
                    id="workspace-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：stock-trend"
                    className="h-8 rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80"
                  />
                  <Input
                    id="workspace-tail"
                    value={tailname}
                    onChange={(event) => setTailname(event.target.value)}
                    placeholder="随机后缀"
                    className="h-8 rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-md border-slate-200/80 bg-white/90 px-3 shadow-none dark:border-[#2c3532] dark:bg-[#151918]"
                    onClick={() => setTailname(tail())}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-[#809088]">
                  {full ? `创建目录将使用：${full}` : "请填写策略名称，后缀可修改或刷新"}
                </div>
              </Block>

              <Block title="策略模板" hint="模板决定初始工程结构与默认 agent">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(cards).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-md border px-4 py-4 text-left transition-all ${kind === key ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100 dark:border-[#4d6f62] dark:bg-[#15201c]" : "border-slate-200/80 bg-white/90 hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-[#26302c] dark:bg-[#141918]"}`}
                      onClick={() => setKind(key as StrategyType)}
                    >
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                        {item.icon}
                        {item.title}
                      </div>
                      <div className="text-xs leading-5 text-slate-600 dark:text-[#93a39c]">{item.desc}</div>
                      <div className="mt-3 text-[11px] text-slate-500 dark:text-[#809088]">模板：{item.template}</div>
                    </button>
                  ))}
                </div>
              </Block>

              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-md border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.8))] px-4 py-3 text-sm leading-6 text-emerald-950/80 dark:border-[#29443b] dark:bg-[linear-gradient(180deg,rgba(20,33,28,0.95),rgba(17,22,21,0.95))] dark:text-[#a7c3b8]">
                  Python、JS 和 SmartX 现在共用一套详细策略画像表单，默认市场是股票。
                </div>
                <div className="rounded-md border border-slate-200/80 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-500 dark:border-[#26302c] dark:bg-[#141918] dark:text-[#83928c]">
                  工作区目录
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-[#eef5f1]">{card.root}</div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            rich ? (
              <Tabs value={panel} onValueChange={setPanel} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-[#26302c] dark:bg-[#141918]">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">补齐策略画像</div>
                    <div className="text-xs text-slate-500 dark:text-[#809088]">
                      统一描述市场、指标、交易规则、风控和输出要求。
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-[#355145] dark:bg-[#17211d] dark:text-[#a8c6bb]">
                    {guide.kind} / {guide.market} / {guide.tf}
                  </div>
                </div>
                <TabsList className="grid h-12 w-full grid-cols-4 rounded-[22px] border border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_35px_-28px_rgba(15,23,42,0.35)] dark:border-[#27332e] dark:bg-[linear-gradient(180deg,#1d2522_0%,#161c1a_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <TabsTrigger
                    value="market"
                    className="rounded-2xl px-3 text-sm font-medium text-slate-500 transition-all hover:text-slate-900 data-[state=active]:border-slate-200/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] dark:text-[#7f938a] dark:hover:text-[#eef5f1] dark:data-[state=active]:border-[#31413a] dark:data-[state=active]:bg-[#22302b] dark:data-[state=active]:text-[#f4fbf7] dark:data-[state=active]:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.7)]"
                  >
                    市场
                  </TabsTrigger>
                  <TabsTrigger
                    value="logic"
                    className="rounded-2xl px-3 text-sm font-medium text-slate-500 transition-all hover:text-slate-900 data-[state=active]:border-slate-200/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] dark:text-[#7f938a] dark:hover:text-[#eef5f1] dark:data-[state=active]:border-[#31413a] dark:data-[state=active]:bg-[#22302b] dark:data-[state=active]:text-[#f4fbf7] dark:data-[state=active]:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.7)]"
                  >
                    逻辑
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="rounded-2xl px-3 text-sm font-medium text-slate-500 transition-all hover:text-slate-900 data-[state=active]:border-slate-200/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] dark:text-[#7f938a] dark:hover:text-[#eef5f1] dark:data-[state=active]:border-[#31413a] dark:data-[state=active]:bg-[#22302b] dark:data-[state=active]:text-[#f4fbf7] dark:data-[state=active]:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.7)]"
                  >
                    风控
                  </TabsTrigger>
                  <TabsTrigger
                    value="output"
                    className="rounded-2xl px-3 text-sm font-medium text-slate-500 transition-all hover:text-slate-900 data-[state=active]:border-slate-200/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] dark:text-[#7f938a] dark:hover:text-[#eef5f1] dark:data-[state=active]:border-[#31413a] dark:data-[state=active]:bg-[#22302b] dark:data-[state=active]:text-[#f4fbf7] dark:data-[state=active]:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.7)]"
                  >
                    输出
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="market" className="space-y-4">
                  <Block title="策略框架">
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
                    <Block title="标的池">
                      <div className="flex flex-wrap gap-2">
                        {pools.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.pool === item}
                            onClick={() => setGuide((prev) => ({ ...prev, pool: item }))}
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
                  <div className="grid gap-4 xl:grid-cols-3">
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
                    <Block title="持仓周期">
                      <div className="flex flex-wrap gap-2">
                        {holds.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.hold === item}
                            onClick={() => setGuide((prev) => ({ ...prev, hold: item }))}
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

                <TabsContent value="logic" className="space-y-4">
                  <Block title="信号来源">
                    <div className="flex flex-wrap gap-2">
                      {sources.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.source.includes(item)}
                          onClick={() => setGuide((prev) => ({ ...prev, source: toggle(prev.source, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="指标与因子" hint="建议至少选择 1 到 3 项">
                    <div className="flex flex-wrap gap-2">
                      {factors.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.factor.includes(item)}
                          onClick={() => setGuide((prev) => ({ ...prev, factor: toggle(prev.factor, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Block title="过滤条件">
                      <div className="flex flex-wrap gap-2">
                        {filters.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.filter.includes(item)}
                            onClick={() => setGuide((prev) => ({ ...prev, filter: toggle(prev.filter, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="入场规则">
                      <div className="flex flex-wrap gap-2">
                        {entries.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.entry.includes(item)}
                            onClick={() => setGuide((prev) => ({ ...prev, entry: toggle(prev.entry, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="出场规则">
                      <div className="flex flex-wrap gap-2">
                        {exits.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.exit.includes(item)}
                            onClick={() => setGuide((prev) => ({ ...prev, exit: toggle(prev.exit, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                </TabsContent>

                <TabsContent value="risk" className="space-y-4">
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
                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
                    <Block title="止盈止损">
                      <div className="flex flex-wrap gap-2">
                        {stops.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.stop.includes(item)}
                            onClick={() => setGuide((prev) => ({ ...prev, stop: toggle(prev.stop, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="仓位方式">
                      <div className="flex flex-wrap gap-2">
                        {poses.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.pos === item}
                            onClick={() => setGuide((prev) => ({ ...prev, pos: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="交易约束">
                      <div className="flex flex-wrap gap-2">
                        {limits.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.limit.includes(item)}
                            onClick={() => setGuide((prev) => ({ ...prev, limit: toggle(prev.limit, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                </TabsContent>

                <TabsContent value="output" className="space-y-4">
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
                  <Block title="核心目标">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={guide.target}
                        onChange={(value) => setGuide((prev) => ({ ...prev, target: value }))}
                        height={110}
                        placeholder="例如：先给出适合股票日线趋势策略的完整框架，再输出可回测的初版代码。"
                      />
                    </div>
                  </Block>
                  <Block title="补充说明">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={guide.note}
                        onChange={(value) => setGuide((prev) => ({ ...prev, note: value }))}
                        height={130}
                        placeholder="例如：优先考虑股票市场，默认日线级别，不追求高频；代码要清晰，方便后续继续调参。"
                      />
                    </div>
                  </Block>
                  <Block title="额外落地要求">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={brief}
                        onChange={setBrief}
                        height={110}
                        placeholder={
                          kind === "python"
                            ? "例如：拆出 indicators、signals、risk、backtest 四个模块。"
                            : kind === "js"
                              ? "例如：拆出指标、信号、执行入口与配置文件。"
                              : "例如：代码先按 SmartX 工程方式组织，关键参数集中管理。"
                        }
                      />
                    </div>
                  </Block>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <Block title="补充说明">
                  <div className="rounded-md bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={brief}
                      onChange={setBrief}
                      height={220}
                      placeholder="例如：帮我生成一个简单的网格策略"
                    />
                  </div>
                </Block>
              </div>
            )
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <Block title="当前创建配置">
                  <div className="mb-4 grid gap-3">
                    <div className="space-y-2">
                      <Label>使用模式</Label>
                      <Select value={composer.agent?.name} onValueChange={setAgent}>
                        <SelectTrigger className="h-10 w-full rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                          <SelectValue placeholder="选择模式" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <SelectTrigger className="h-10 w-full rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
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
                    <div>类型：{card.title}</div>
                    <div>模板：{card.template}</div>
                    <div>名称：{full || "-"}</div>
                    <div>目录：{card.root}</div>
                    {rich ? (
                      <>
                        <div>市场：{guide.market}</div>
                        <div>标的池：{guide.pool}</div>
                        <div>周期：{guide.tf}</div>
                        <div>指标：{text(guide.factor)}</div>
                        <div>风控：{text(guide.risk)}</div>
                      </>
                    ) : null}
                  </div>
                </Block>
              </div>
              {rich ? (
                <Block title="首条引导消息" hint="创建后会自动发送到首个会话">
                  <div className="rounded-md bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={prompt}
                      onChange={setPrompt}
                      height={420}
                      placeholder="这里会自动生成引导消息，你也可以继续调整。"
                    />
                  </div>
                </Block>
              ) : (
                <Block title="确认创建" hint="通用工作区不会预填策略引导">
                  <div className="text-sm leading-6 text-slate-600 dark:text-[#93a39c]">
                    其他类型会直接创建通用工作区。
                    {brief.trim()
                      ? " 你填写的补充说明会在创建后作为首条消息发送。"
                      : " 如果没有补充说明，就只创建工作区，不自动填充引导消息。"}
                  </div>
                </Block>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(249,250,251,0.7),rgba(255,255,255,0.92))] px-5 py-4 dark:border-[#202725] dark:bg-[linear-gradient(180deg,rgba(16,21,20,0.8),rgba(16,21,20,0.96))]">
          <Button
            variant="outline"
            className="rounded-md border-slate-200/80 bg-white/90 shadow-none dark:border-[#2c3532] dark:bg-[#151918]"
            onClick={() => (step === 0 ? props.onOpenChange(false) : setStep((prev) => prev - 1))}
            disabled={busy}
          >
            {step === 0 ? "取消" : "上一步"}
          </Button>
          {step < 2 ? (
            <Button
              className="rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
              onClick={next}
              disabled={busy}
            >
              下一步
            </Button>
          ) : (
            <Button
              className="rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
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
