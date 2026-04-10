import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkflowNodePanel } from "@/components/workflow/workflow-node-panel"
import { edgeCond, edgeOptions } from "@/lib/workflow-runtime"
import type {
  WorkflowEdgeCond,
  WorkflowField,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeRun,
  WorkflowRun,
  WorkflowSummary,
} from "@/types/workflow"

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

type Props = {
  edge: WorkflowFlowEdge | null
  node: WorkflowFlowNode | null
  run: WorkflowRun | null
  runs: WorkflowRun[]
  summary: WorkflowSummary | null
  rows: WorkflowNodeRun[]
  current: WorkflowNodeRun | null
  nodes: WorkflowFlowNode[]
  onPickRun: (id: string) => void
  onEdgeCond: (value: WorkflowEdgeCond) => void
  onEdgeLabel: (value: string) => void
  onNodeTitle: (value: string) => void
  onNodeFields: (value: WorkflowField[]) => void
}

function stamp(value?: number) {
  if (!value) return "-"
  return fmt.format(new Date(value))
}

function span(ms?: number) {
  if (!ms || ms <= 0) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round((ms / 1000) * 10) / 10}s`
  if (ms < 3_600_000) return `${Math.round((ms / 60_000) * 10) / 10}m`
  return `${Math.round((ms / 3_600_000) * 10) / 10}h`
}

function cost(from?: number, to?: number) {
  if (!from) return "-"
  return span(Math.max(0, (to || Date.now()) - from))
}

function runLabel(status?: WorkflowRun["status"] | WorkflowNodeRun["status"]) {
  if (status === "pending" || status === "queued") return "排队中"
  if (status === "running") return "运行中"
  if (status === "waiting") return "等待中"
  if (status === "failed") return "失败"
  if (status === "done") return "已完成"
  if (status === "timeout") return "超时"
  if (status === "interrupted") return "已中断"
  if (status === "cancelled") return "已取消"
  return "空闲"
}

function passLabel(pass?: boolean) {
  if (pass === true) return "通过"
  if (pass === false) return "失败"
  return "-"
}

function card(title: string, body: string) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-3 py-4 text-sm text-muted-foreground">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-2 leading-6">{body}</div>
    </div>
  )
}

function info(label: string, value: string) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-44 truncate text-right font-medium text-foreground">{value || "-"}</span>
    </div>
  )
}

function nodeName(nodes: WorkflowFlowNode[], id?: string) {
  if (!id) return "-"
  return nodes.find((item) => item.id === id)?.data.title || id
}

function retry(nodes: WorkflowFlowNode[], id?: string) {
  const node = nodes.find((item) => item.id === id)
  const row = node?.data.fields.find((item) => item.key === "retry" && item.kind === "select")
  if (!row || row.kind !== "select") return 2
  const value = Number.parseInt(row.value || "2", 10)
  if (!Number.isFinite(value) || value < 0) return 2
  return value
}

function timeoutOf(nodes: WorkflowFlowNode[], id?: string) {
  const node = nodes.find((item) => item.id === id)
  const row = node?.data.fields.find((item) => item.key === "timeout" && item.kind === "select")
  if (!row || row.kind !== "select") return 0
  const value = Number.parseInt(row.value || "0", 10)
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function attempts(rows: WorkflowNodeRun[], nodeID: string, rowID?: string) {
  let total = 0
  let cur = 0
  rows.forEach((row) => {
    if (row.node_id !== nodeID) return
    total++
    if (row.id === rowID) cur = total
  })
  return { cur: cur || total, total }
}

function parseNode(row: WorkflowNodeRun) {
  const text = row.result?.structured?.trim()
  if (!text) return null
  try {
    const data = JSON.parse(text) as {
      route?: string
      pass?: boolean
      summary?: string
      handoff?: string
      issues?: string[]
      steps?: string[]
      deliverables?: string[]
      risks?: string[]
    }
    return {
      route: typeof data.route === "string" ? data.route.trim() : row.result?.route?.trim(),
      pass: typeof data.pass === "boolean" ? data.pass : row.result?.pass,
      summary: typeof data.summary === "string" ? data.summary.trim() : row.result?.text?.trim(),
      handoff: typeof data.handoff === "string" ? data.handoff.trim() : row.result?.handoff?.trim(),
      issues: Array.isArray(data.issues) ? data.issues.filter((item): item is string => typeof item === "string" && !!item.trim()) : (row.result?.issues || []),
      steps: Array.isArray(data.steps) ? data.steps.filter((item): item is string => typeof item === "string" && !!item.trim()) : (row.result?.steps || []),
      deliverables: Array.isArray(data.deliverables)
        ? data.deliverables.filter((item): item is string => typeof item === "string" && !!item.trim())
        : (row.result?.deliverables || []),
      risks: Array.isArray(data.risks) ? data.risks.filter((item): item is string => typeof item === "string" && !!item.trim()) : (row.result?.risks || []),
    }
  } catch {
    return null
  }
}

function EdgePanel(props: {
  edge: WorkflowFlowEdge
  nodes: WorkflowFlowNode[]
  onEdgeCond: (value: WorkflowEdgeCond) => void
  onEdgeLabel: (value: string) => void
}) {
  const kind = props.nodes.find((item) => item.id === props.edge.source)?.data.kind
  const opts = edgeOptions(kind)
  const value = edgeCond(kind, typeof props.edge.data?.cond === "string" ? props.edge.data.cond : undefined)

  return (
    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">连线</div>
        <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          {props.edge.source} {">"} {props.edge.target}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">条件</div>
          <Select value={value} onValueChange={(row) => props.onEdgeCond(row as WorkflowEdgeCond)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择条件" />
            </SelectTrigger>
            <SelectContent>
              {opts.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">标签</div>
          <Input
            value={typeof props.edge.label === "string" ? props.edge.label : ""}
            onChange={(event) => props.onEdgeLabel(event.target.value)}
            placeholder="可选的连线标签"
          />
        </div>
      </div>
    </section>
  )
}

export function WorkflowSidepanel(props: Props) {
  const [tab, setTab] = useState("workflow")
  const runs = props.runs || []
  const rows = props.rows || []
  const nodes = props.nodes || []
  const stats = props.summary?.nodes || []
  const live = nodes.find((item) => item.id === props.run?.current_node_id) || null
  const tries = attempts(rows, props.current?.node_id || "", props.current?.id)

  useEffect(() => {
    if (props.node || props.edge) {
      setTab("attrs")
      return
    }
    setTab((prev) => prev)
  }, [props.edge, props.node])

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-border/70 bg-sidebar/95 backdrop-blur">
      <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b border-border/70 px-3 py-3">
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium text-foreground">侧边面板</div>
            <div className="text-xs leading-5 text-muted-foreground">
              在“工作流”页签查看运行历史，在“属性”页签编辑节点或连线。
            </div>
          </div>

          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="workflow" className="h-full rounded-lg text-sm">
              工作流
            </TabsTrigger>
            <TabsTrigger value="attrs" className="h-full rounded-lg text-sm">
              属性
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workflow" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <Tabs defaultValue="run" className="flex h-full min-h-0 flex-col gap-0">
            <div className="border-b border-border/70 px-3 py-3">
              <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="run" className="h-full rounded-lg text-sm">
                  当前运行
                </TabsTrigger>
                <TabsTrigger value="runs" className="h-full rounded-lg text-sm">
                  历史
                </TabsTrigger>
                <TabsTrigger value="stats" className="h-full rounded-lg text-sm">
                  统计
                </TabsTrigger>
                <TabsTrigger value="log" className="h-full rounded-lg text-sm">
                  日志
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="run" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto p-3">
                <div className="space-y-3">
                  {props.run ? (
                    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">当前运行</div>
                        <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                          {runLabel(props.run.status)}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("运行 ID", props.run.id)}
                        {info("工作区", props.run.workspace_path || "-")}
                        {info("会话", props.run.session_id || "-")}
                        {info("节点", nodeName(nodes, props.run.current_node_id))}
                        {info("开始时间", stamp(props.run.started_at))}
                        {info("结束时间", stamp(props.run.ended_at))}
                        {info("耗时", cost(props.run.started_at, props.run.ended_at))}
                        {props.run.error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{props.run.error}</div> : null}
                      </div>
                    </section>
                  ) : (
                    card("暂无运行记录", "当前工作流模板还没有产生运行数据。")
                  )}

                  {live && props.current ? (
                    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="text-sm font-medium text-foreground">当前步骤</div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("标题", live.data.title || live.data.kind)}
                        {info("类型", live.data.kind)}
                        {info("会话", props.current.session_id || "-")}
                        {info("尝试次数", `${Math.max(tries.cur, 1)}/${retry(nodes, live.id) + 1}`)}
                        {info("超时", timeoutOf(nodes, live.id) > 0 ? `${Math.round(timeoutOf(nodes, live.id) / 1000)}s` : "默认")}
                        {info("耗时", cost(props.current.started_at, props.current.ended_at))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="runs" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto p-3">
                {runs.length === 0 ? (
                  card("暂无历史", "工作流运行后，这里会显示运行历史。")
                ) : (
                  <div className="space-y-3">
                    {runs.map((item) => {
                      const active = item.id === props.run?.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => props.onPickRun(item.id)}
                          className={`w-full rounded-xl border px-3 py-3 text-left shadow-xs transition-colors ${
                            active ? "border-primary/40 bg-primary/5" : "border-border/70 bg-background/85 hover:border-primary/30 hover:bg-accent/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate text-sm font-medium text-foreground">{item.id}</div>
                            <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {runLabel(item.status)}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                            <div>工作区：{item.workspace_path || "-"}</div>
                            <div>开始时间：{stamp(item.started_at)}</div>
                            <div>结束时间：{stamp(item.ended_at)}</div>
                            <div>耗时：{cost(item.started_at, item.ended_at)}</div>
                            <div>节点：{nodeName(nodes, item.current_node_id)}</div>
                          </div>
                          {item.error ? <div className="mt-2 text-xs leading-5 text-destructive">{item.error}</div> : null}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto p-3">
                {!props.summary ? (
                  card("暂无统计", "有运行记录后，这里会显示工作流汇总数据。")
                ) : (
                  <div className="space-y-3">
                    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="text-sm font-medium text-foreground">工作流汇总</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">运行次数</div>
                          <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">节点运行次数</div>
                          <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_node_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">已完成</div>
                          <div className="mt-1 text-lg font-medium text-emerald-600">{props.summary.done_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">失败</div>
                          <div className="mt-1 text-lg font-medium text-destructive">{props.summary.failed_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">等待中</div>
                          <div className="mt-1 text-lg font-medium text-amber-600">{props.summary.waiting_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">运行中</div>
                          <div className="mt-1 text-lg font-medium text-sky-600">{props.summary.running_runs}</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("平均耗时", span(props.summary.avg_run_ms))}
                        {info("最近运行", stamp(props.summary.last_run_at))}
                      </div>
                    </section>

                    {stats.length === 0 ? (
                      card("暂无节点统计", "有运行记录后，这里会显示每个节点的汇总数据。")
                    ) : (
                      <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                        <div className="text-sm font-medium text-foreground">节点汇总</div>
                        <div className="mt-3 space-y-3">
                          {stats.map((item) => (
                            <div key={item.node_id} className="rounded-lg border border-border/70 px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-foreground">{item.title || item.node_id}</div>
                                  <div className="truncate text-[11px] text-muted-foreground">{item.kind}</div>
                                </div>
                                <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                                  {runLabel(item.last_status)}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-md bg-muted/40 px-2 py-2">
                                  <div className="text-[10px] text-muted-foreground">Total</div>
                                  <div className="mt-1 text-sm font-medium text-foreground">{item.total}</div>
                                </div>
                                <div className="rounded-md bg-muted/40 px-2 py-2">
                                  <div className="text-[10px] text-muted-foreground">已完成</div>
                                  <div className="mt-1 text-sm font-medium text-emerald-600">{item.done}</div>
                                </div>
                                <div className="rounded-md bg-muted/40 px-2 py-2">
                                  <div className="text-[10px] text-muted-foreground">失败</div>
                                  <div className="mt-1 text-sm font-medium text-destructive">{item.failed + item.timeout}</div>
                                </div>
                              </div>
                              <div className="mt-3 space-y-1 text-[11px] leading-5 text-muted-foreground">
                                <div>平均耗时：{span(item.avg_ms)}</div>
                                <div>最近运行：{stamp(item.last_run_at)}</div>
                                <div>等待中：{item.waiting} | 运行中：{item.running} | 超时：{item.timeout}</div>
                                <div>通过：{item.pass} | 失败：{item.fail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="log" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto p-3">
                {rows.length === 0 ? (
                  card("暂无日志", "工作流运行后，这里会显示节点执行历史。")
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const review = parseNode(row)
                      const cfg = nodes.find((item) => item.id === row.node_id)
                      const step = attempts(rows, row.node_id, row.id)

                      return (
                        <section key={row.id} className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate text-sm font-medium text-foreground">{nodeName(nodes, row.node_id)}</div>
                            <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {runLabel(row.status)}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                            <div>节点 ID：{row.node_id}</div>
                            <div>会话：{row.session_id || "-"}</div>
                            <div>尝试次数：{step.cur} / {retry(nodes, cfg?.id) + 1}</div>
                            <div>开始时间：{stamp(row.started_at)}</div>
                            <div>结束时间：{stamp(row.ended_at)}</div>
                            <div>耗时：{cost(row.started_at, row.ended_at)}</div>
                          </div>

                          {review ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
                                <span className="text-xs text-muted-foreground">检查结果</span>
                                <span
                                  className={
                                    review.pass === true
                                      ? "text-xs font-medium text-emerald-600"
                                      : review.pass === false
                                        ? "text-xs font-medium text-destructive"
                                        : "text-xs font-medium text-foreground"
                                  }
                                >
                                  {passLabel(review.pass)}
                                </span>
                              </div>

                              {review.summary ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">摘要</div>
                                  <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{review.summary}</div>
                                </div>
                              ) : null}

                              {review.route ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">路由</div>
                                  <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{review.route}</div>
                                </div>
                              ) : null}

                              {review.steps.length > 0 ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">步骤</div>
                                  <div className="mt-1 space-y-1">
                                    {review.steps.map((item, i) => (
                                      <div key={`${row.id}-step-${i}`} className="text-xs leading-5 text-foreground">
                                        {i + 1}. {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {review.issues.length > 0 ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">问题</div>
                                  <div className="mt-1 space-y-1">
                                    {review.issues.map((item, i) => (
                                      <div key={`${row.id}-issue-${i}`} className="text-xs leading-5 text-foreground">
                                        {i + 1}. {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {review.deliverables.length > 0 ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">交付物</div>
                                  <div className="mt-1 space-y-1">
                                    {review.deliverables.map((item, i) => (
                                      <div key={`${row.id}-deliverable-${i}`} className="text-xs leading-5 text-foreground">
                                        {i + 1}. {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {review.risks.length > 0 ? (
                                <div className="rounded-lg border border-border/70 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">风险</div>
                                  <div className="mt-1 space-y-1">
                                    {review.risks.map((item, i) => (
                                      <div key={`${row.id}-risk-${i}`} className="text-xs leading-5 text-foreground">
                                        {i + 1}. {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {review.handoff ? (
                                <div className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                                  交接说明：{review.handoff}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {row.output && !review ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{row.output}</div> : null}

                          {row.output && review ? (
                            <details className="mt-2 rounded-lg border border-dashed border-border/70 px-3 py-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground">原始输出</summary>
                              <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{row.output}</div>
                            </details>
                          ) : null}

                          {row.error ? <div className="mt-2 text-xs leading-5 text-destructive">{row.error}</div> : null}
                        </section>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="attrs" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            {props.edge ? <EdgePanel edge={props.edge} nodes={props.nodes} onEdgeCond={props.onEdgeCond} onEdgeLabel={props.onEdgeLabel} /> : null}
            {props.node ? (
              <div className={props.edge ? "mt-3" : ""}>
                <WorkflowNodePanel node={props.node} onTitle={props.onNodeTitle} onFields={props.onNodeFields} />
              </div>
            ) : null}
            {!props.edge && !props.node ? card("未选择内容", "选择一个节点或连线后，可在这里编辑它的属性。") : null}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
