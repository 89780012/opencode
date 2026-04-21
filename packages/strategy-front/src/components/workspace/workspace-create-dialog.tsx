import type { ReactNode } from "react"
import { ChevronRight, RefreshCw } from "lucide-react"
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
import { useWorkspaceCreate } from "@/hooks/use-workspace-create"
import { cards, flip, picks, text } from "@/lib/strategy-create"
import type { StrategyType } from "@/lib/strategy-guide"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

/**
 * 标签按钮，仅负责渲染单个可切换选项。
 */
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

/**
 * 创建弹窗中的分组容器。
 */
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

/**
 * 向导顶部的步骤圆点。
 */
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

/**
 * 新建策略弹窗，主要负责渲染向导界面。
 */
export function WorkspaceCreateDialog(props: Props) {
  const form = useWorkspaceCreate(props)
  const state = form.state
  const guide = state.guide

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open)
        if (!open) {
          form.reset()
        }
      }}
    >
      <DialogContent className="flex h-[min(760px,calc(100dvh-32px))] max-h-[calc(100dvh-32px)] w-[min(820px,calc(100vw-24px))] max-w-[1240px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[#fcfcfa] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.14)] dark:border-[#252e2b] dark:bg-[#101514]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.94))] px-5 py-4 dark:border-[#202725] dark:bg-[radial-gradient(circle_at_top_left,rgba(122,165,144,0.2),transparent_32%),linear-gradient(180deg,rgba(17,22,21,0.98),rgba(15,20,19,0.95))]">
          <DialogHeader className="mb-3 gap-1 text-left">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-700/80 dark:text-[#8eb7a5]">
              策略实验室
            </div>
            <DialogTitle className="text-[22px] font-semibold tracking-[0.01em] text-slate-900 dark:text-[#eef5f1]">
              新建策略
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-[#95a39d]">
              先选择模板，再补齐市场、指标、规则、风控与输出要求。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            {form.steps.map((item, i) => (
              <div key={item} className="flex items-center gap-2">
                <Dot active={i === state.step} done={i < state.step} text={item} step={i + 1} />
                {i < form.steps.length - 1 ? (
                  <ChevronRight className="size-4 text-slate-300 dark:text-[#31403b]" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {state.step === 0 ? (
            <div className="space-y-4">
              <Block title="策略名称" hint="用于工作区目录和默认会话标题">
                <Label htmlFor="workspace-name">策略名称</Label>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <Input
                    id="workspace-name"
                    value={state.name}
                    onChange={(event) => form.setName(event.target.value)}
                    placeholder="例如：stock-trend"
                    className="h-8 rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80"
                  />
                  <Input
                    id="workspace-tail"
                    value={state.tail}
                    onChange={(event) => form.setTail(event.target.value)}
                    placeholder="随机后缀"
                    className="h-8 rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-md border-slate-200/80 bg-white/90 px-3 shadow-none dark:border-[#2c3532] dark:var(--shell-dark-bg)"
                    onClick={form.refreshTail}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-[#809088]">
                  {form.full ? `创建目录将使用：${form.full}` : "请填写策略名称，后缀可修改或刷新"}
                </div>
              </Block>

              <Block title="策略模板" hint="模板决定初始工程结构与默认 agent">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(cards).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-md border px-4 py-4 text-left transition-all ${state.kind === key ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100 dark:border-[#4d6f62] dark:bg-[#15201c]" : "border-slate-200/80 bg-white/90 hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-[#26302c] dark:bg-[#141918]"}`}
                      onClick={() => form.setKind(key as StrategyType)}
                    >
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#eef5f1]">
                        {item.icon}
                        {item.title}
                      </div>
                      <div className="text-xs leading-5 text-slate-600 dark:text-[#93a39c]">{item.desc}</div>
                      <div className="mt-3 text-[11px] text-slate-500 dark:text-[#809088]">{item.root}</div>
                    </button>
                  ))}
                </div>
              </Block>
            </div>
          ) : null}

          {state.step === 1 ? (
            form.rich ? (
              <Tabs
                value={form.panel}
                onValueChange={(value) => form.setPanel(value as (typeof picks.panels)[number])}
                className="space-y-4"
              >
                <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-slate-100/80 p-1 dark:bg-[#161d1b]">
                  <TabsTrigger value="market">市场</TabsTrigger>
                  <TabsTrigger value="logic">逻辑</TabsTrigger>
                  <TabsTrigger value="risk">风控</TabsTrigger>
                  <TabsTrigger value="output">输出</TabsTrigger>
                </TabsList>

                <TabsContent value="market" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Block title="策略类型">
                      <div className="flex flex-wrap gap-2">
                        {picks.kinds.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.kind === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, kind: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="市场">
                      <div className="flex flex-wrap gap-2">
                        {picks.markets.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.market === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, market: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="标的池">
                      <div className="flex flex-wrap gap-2">
                        {picks.pools.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.pool === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, pool: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Block title="周期">
                      <div className="flex flex-wrap gap-2">
                        {picks.tfs.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.tf === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, tf: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="方向">
                      <div className="flex flex-wrap gap-2">
                        {picks.sides.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.side === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, side: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="持仓周期">
                      <div className="flex flex-wrap gap-2">
                        {picks.holds.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.hold === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, hold: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                  <Block title="开发风格">
                    <div className="flex flex-wrap gap-2">
                      {picks.styles.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.style === item}
                          onClick={() => form.setGuide((prev) => ({ ...prev, style: item }))}
                        />
                      ))}
                    </div>
                  </Block>
                </TabsContent>

                <TabsContent value="logic" className="space-y-4">
                  <Block title="信号来源">
                    <div className="flex flex-wrap gap-2">
                      {picks.sources.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.source.includes(item)}
                          onClick={() => form.setGuide((prev) => ({ ...prev, source: flip(prev.source, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="指标与因子" hint="建议至少选择 1 到 3 项">
                    <div className="flex flex-wrap gap-2">
                      {picks.factors.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.factor.includes(item)}
                          onClick={() => form.setGuide((prev) => ({ ...prev, factor: flip(prev.factor, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <Block title="过滤条件">
                      <div className="flex flex-wrap gap-2">
                        {picks.filters.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.filter.includes(item)}
                            onClick={() => form.setGuide((prev) => ({ ...prev, filter: flip(prev.filter, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="入场规则">
                      <div className="flex flex-wrap gap-2">
                        {picks.entries.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.entry.includes(item)}
                            onClick={() => form.setGuide((prev) => ({ ...prev, entry: flip(prev.entry, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="离场规则">
                      <div className="flex flex-wrap gap-2">
                        {picks.exits.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.exit.includes(item)}
                            onClick={() => form.setGuide((prev) => ({ ...prev, exit: flip(prev.exit, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                </TabsContent>

                <TabsContent value="risk" className="space-y-4">
                  <Block title="风控重点">
                    <div className="flex flex-wrap gap-2">
                      {picks.risks.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.risk.includes(item)}
                          onClick={() => form.setGuide((prev) => ({ ...prev, risk: flip(prev.risk, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
                    <Block title="止盈止损">
                      <div className="flex flex-wrap gap-2">
                        {picks.stops.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.stop.includes(item)}
                            onClick={() => form.setGuide((prev) => ({ ...prev, stop: flip(prev.stop, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="仓位方式">
                      <div className="flex flex-wrap gap-2">
                        {picks.poses.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.pos === item}
                            onClick={() => form.setGuide((prev) => ({ ...prev, pos: item }))}
                          />
                        ))}
                      </div>
                    </Block>
                    <Block title="交易约束">
                      <div className="flex flex-wrap gap-2">
                        {picks.limits.map((item) => (
                          <Chip
                            key={item}
                            text={item}
                            active={guide.limit.includes(item)}
                            onClick={() => form.setGuide((prev) => ({ ...prev, limit: flip(prev.limit, item) }))}
                          />
                        ))}
                      </div>
                    </Block>
                  </div>
                </TabsContent>

                <TabsContent value="output" className="space-y-4">
                  <Block title="输出要求">
                    <div className="flex flex-wrap gap-2">
                      {picks.outputs.map((item) => (
                        <Chip
                          key={item}
                          text={item}
                          active={guide.output.includes(item)}
                          onClick={() => form.setGuide((prev) => ({ ...prev, output: flip(prev.output, item) }))}
                        />
                      ))}
                    </div>
                  </Block>
                  <Block title="核心目标">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={guide.target}
                        onChange={(value) => form.setGuide((prev) => ({ ...prev, target: value }))}
                        height={110}
                        placeholder="先给出完整策略框架，再输出可回测的初版代码。"
                      />
                    </div>
                  </Block>
                  <Block title="补充说明">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={guide.note}
                        onChange={(value) => form.setGuide((prev) => ({ ...prev, note: value }))}
                        height={130}
                        placeholder="例如：优先考虑股票市场，默认日线级别，不追求高频；代码要清晰，方便后续继续调参。"
                      />
                    </div>
                  </Block>
                  <Block title="额外落地要求">
                    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                      <AutoResizeTextarea
                        value={state.brief}
                        onChange={form.setBrief}
                        height={110}
                        placeholder={
                          state.kind === "python"
                            ? "例如：拆出 indicators、signals、risk、backtest 四个模块。"
                            : state.kind === "js"
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
                      value={state.brief}
                      onChange={form.setBrief}
                      height={220}
                      placeholder="例如：帮我生成一个简单的网格策略。"
                    />
                  </div>
                </Block>
              </div>
            )
          ) : null}

          {state.step === 2 ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <Block title="当前创建配置">
                  <div className="mb-4 grid gap-3">
                    <div className="space-y-2">
                      <Label>使用智能体</Label>
                      <Select value={form.composer.agent?.name} onValueChange={form.setAgent}>
                        <SelectTrigger className="h-10 w-full rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                          <SelectValue placeholder="选择智能体" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.ags.ags.map((item) => (
                            <SelectItem key={item.name} value={item.name}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>使用模型</Label>
                      <Select value={form.model} onValueChange={form.setModel}>
                        <SelectTrigger className="h-10 w-full rounded-md border-transparent bg-white/90 shadow-none ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2d3733]">
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.models.map((item) => {
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
                    <div>创建方式：普通创建</div>
                    <div>类型：{form.card.title}</div>
                    <div>模板：{form.card.template}</div>
                    <div>名称：{form.full || "-"}</div>
                    <div>目录：{form.card.root}</div>
                    {form.rich ? (
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

              {form.rich ? (
                <Block title="首条引导消息" hint="创建后会自动发送到首个会话">
                  <div className="rounded-md bg-white/92 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#141918] dark:ring-[#2c3532]">
                    <AutoResizeTextarea
                      value={state.prompt}
                      onChange={form.setPrompt}
                      height={420}
                      placeholder="这里会自动生成引导消息，你也可以继续调整。"
                    />
                  </div>
                </Block>
              ) : (
                <Block title="确认创建" hint="通用工作区不会预填策略引导">
                  <div className="text-sm leading-6 text-slate-600 dark:text-[#93a39c]">
                    其他类型会直接创建通用工作区。
                    {state.brief.trim()
                      ? " 你填写的补充说明会在创建后作为首条消息发送。"
                      : " 如果没有补充说明，就只创建工作区，不自动发送引导消息。"}
                  </div>
                </Block>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(249,250,251,0.7),rgba(255,255,255,0.92))] px-5 py-4 dark:border-[#202725] dark:bg-[linear-gradient(180deg,rgba(16,21,20,0.8),rgba(16,21,20,0.96))]">
          <Button
            variant="outline"
            className="rounded-md border-slate-200/80 bg-white/90 shadow-none dark:border-[#2c3532] dark:var(--shell-dark-bg)"
            onClick={form.prev}
            disabled={form.busy}
          >
            {state.step === 0 ? "取消" : "上一步"}
          </Button>
          {state.step < 2 ? (
            <Button
              className="rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
              onClick={form.next}
              disabled={form.busy}
            >
              下一步
            </Button>
          ) : (
            <Button
              className="rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#7aa590] dark:text-[#08110e] dark:hover:bg-[#8bb09f]"
              onClick={() => void form.create()}
              disabled={form.busy}
            >
              {form.busy ? "创建中..." : "创建并进入策略页"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
