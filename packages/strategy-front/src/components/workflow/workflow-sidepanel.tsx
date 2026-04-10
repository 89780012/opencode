import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkflowNodePanel } from "@/components/workflow/workflow-node-panel"
import type {
  WorkflowEdgeCond,
  WorkflowField,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeRun,
  WorkflowRun,
  WorkflowRuntimeNode,
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
  nodes: WorkflowRuntimeNode[]
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
  if (status === "pending") return "等待中"
  if (status === "running") return "运行中"
  if (status === "blocked") return "已阻塞"
  if (status === "failed") return "失败"
  if (status === "done") return "完成"
  if (status === "timeout") return "超时"
  if (status === "interrupted") return "已中断"
  return "空闲"
}

function passLabel(pass?: boolean) {
  if (pass === true) return "通过"
  if (pass === false) return "未通过"
  return "未判定"
}

function blockLabel(value?: string) {
  if (value === "permission") return "权限请求"
  if (value === "question") return "问题确认"
  return value || "-"
}

function edgeLabel(value?: WorkflowEdgeCond) {
  if (value === "plan") return "进入规划"
  if (value === "build") return "进入执行"
  if (value === "checker") return "进入检查"
  if (value === "pass") return "通过"
  if (value === "fail") return "失败"
  return "始终"
}

function nodeName(nodes: WorkflowRuntimeNode[], id?: string) {
  if (!id) return "-"
  return nodes.find((item) => item.id === id)?.title || id
}

function parseReview(row: WorkflowNodeRun) {
  const text = row.result?.structured?.trim()
  if (!text) return null

  try {
    const data = JSON.parse(text) as {
      pass?: boolean
      summary?: string
      next_prompt?: string
      issues?: string[]
    }
    return {
      pass: typeof data.pass === "boolean" ? data.pass : row.result?.pass,
      summary: typeof data.summary === "string" ? data.summary.trim() : row.result?.text?.trim(),
      next_prompt: typeof data.next_prompt === "string" ? data.next_prompt.trim() : row.result?.next_prompt?.trim(),
      issues: Array.isArray(data.issues)
        ? data.issues.filter((item): item is string => typeof item === "string" && !!item.trim())
        : [],
    }
  } catch {
    return null
  }
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

function attempts(rows: WorkflowNodeRun[], nodeID: string, rowID?: string) {
  let total = 0
  let cur = 0
  for (const row of rows) {
    if (row.node_id !== nodeID) continue
    total++
    if (row.id === rowID) cur = total
  }
  return { cur: cur || total, total }
}

function EdgePanel(props: {
  edge: WorkflowFlowEdge
  onEdgeCond: (value: WorkflowEdgeCond) => void
  onEdgeLabel: (value: string) => void
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">连线属性</div>
        <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          {props.edge.source} {"->"} {props.edge.target}
        </div>
      </div>

      <div className="mt-2 text-xs leading-5 text-muted-foreground">
        `intent` 节点通常使用 `plan` / `build` / `checker` 分支；检查类节点通常使用 `pass` / `fail`；
        普通顺序边使用 `always`。
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">条件</div>
          <Select
            value={
              props.edge.data?.cond === "plan" ||
              props.edge.data?.cond === "build" ||
              props.edge.data?.cond === "checker" ||
              props.edge.data?.cond === "pass" ||
              props.edge.data?.cond === "fail"
                ? props.edge.data.cond
                : "always"
            }
            onValueChange={(value) => props.onEdgeCond(value as WorkflowEdgeCond)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择条件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">{edgeLabel("always")}</SelectItem>
              <SelectItem value="plan">{edgeLabel("plan")}</SelectItem>
              <SelectItem value="build">{edgeLabel("build")}</SelectItem>
              <SelectItem value="checker">{edgeLabel("checker")}</SelectItem>
              <SelectItem value="pass">{edgeLabel("pass")}</SelectItem>
              <SelectItem value="fail">{edgeLabel("fail")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">标签</div>
          <Input
            value={typeof props.edge.label === "string" ? props.edge.label : ""}
            onChange={(event) => props.onEdgeLabel(event.target.value)}
            placeholder="可选，留空时自动显示条件"
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
            <div className="text-sm font-medium text-foreground">右侧面板</div>
            <div className="text-xs leading-5 text-muted-foreground">
              工作流面板用于查看运行和统计；属性面板用于编辑当前选中的节点或连线。
            </div>
          </div>

          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="workflow" className="h-full rounded-lg text-sm">
              工作流面板
            </TabsTrigger>
            <TabsTrigger value="attrs" className="h-full rounded-lg text-sm">
              属性面板
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workflow" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <Tabs defaultValue="run" className="flex h-full min-h-0 flex-col gap-0">
            <div className="border-b border-border/70 px-3 py-3">
              <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="run" className="h-full rounded-lg text-sm">
                  概览
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
                        {info("共享会话", props.run.session_id || "-")}
                        {info("当前节点", nodeName(nodes, props.run.current_node_id))}
                        {info("开始时间", stamp(props.run.started_at))}
                        {info("结束时间", stamp(props.run.ended_at))}
                        {info("运行耗时", cost(props.run.started_at, props.run.ended_at))}
                        {props.run.error ? (
                          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                            {props.run.error}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ) : (
                    card("还没有运行记录", "模板本身只负责描述流程。等它被某个策略绑定并触发后，这里会展示运行信息。")
                  )}

                  {live && props.current ? (
                    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="text-sm font-medium text-foreground">当前节点</div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("节点名称", live.title || live.agent || live.kind)}
                        {info("节点类型", live.kind)}
                        {info("会话 ID", props.current.session_id || "-")}
                        {info("尝试次数", `${Math.max(tries.cur, 1)}/${live.retry_limit + 1}`)}
                        {info("超时", live.timeout_ms > 0 ? `${Math.round(live.timeout_ms / 1000)} 秒` : "默认")}
                        {info("节点耗时", cost(props.current.started_at, props.current.ended_at))}
                      </div>
                    </section>
                  ) : null}

                  {props.run?.status === "blocked" ? (
                    <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                      <div className="text-sm font-medium text-foreground">阻塞详情</div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("阻塞原因", blockLabel(props.run.block_reason))}
                        {info("请求 ID", props.run.block_request_id || "-")}
                        {info("阻塞节点", nodeName(nodes, props.current?.node_id || props.run.current_node_id))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="runs" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto p-3">
                {runs.length === 0 ? (
                  card("还没有运行历史", "当固定工作流在策略聊天页里被触发后，这里会按时间顺序展示每一轮运行。")
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
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/70 bg-background/85 hover:border-primary/30 hover:bg-accent/40"
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
                            <div>开始：{stamp(item.started_at)}</div>
                            <div>结束：{stamp(item.ended_at)}</div>
                            <div>耗时：{cost(item.started_at, item.ended_at)}</div>
                            <div>当前节点：{nodeName(nodes, item.current_node_id)}</div>
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
                  card("还没有统计信息", "模板被实际运行后，这里会展示整体健康度和各节点统计。")
                ) : (
                  <div className="space-y-3">
                    <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="text-sm font-medium text-foreground">工作流统计</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">运行次数</div>
                          <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">节点执行次数</div>
                          <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_node_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">完成</div>
                          <div className="mt-1 text-lg font-medium text-emerald-600">{props.summary.done_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">失败</div>
                          <div className="mt-1 text-lg font-medium text-destructive">{props.summary.failed_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">阻塞</div>
                          <div className="mt-1 text-lg font-medium text-amber-600">{props.summary.blocked_runs}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 px-3 py-2">
                          <div className="text-[11px] text-muted-foreground">运行中</div>
                          <div className="mt-1 text-lg font-medium text-sky-600">{props.summary.running_runs}</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {info("平均运行耗时", span(props.summary.avg_run_ms))}
                        {info("最近一次运行", stamp(props.summary.last_run_at))}
                      </div>
                    </section>

                    {stats.length === 0 ? (
                      card("还没有节点统计", "执行工作流后，这里会累计每个节点的执行次数、结果和耗时。")
                    ) : (
                      <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                        <div className="text-sm font-medium text-foreground">节点统计</div>
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
                                  <div className="text-[10px] text-muted-foreground">总次数</div>
                                  <div className="mt-1 text-sm font-medium text-foreground">{item.total}</div>
                                </div>
                                <div className="rounded-md bg-muted/40 px-2 py-2">
                                  <div className="text-[10px] text-muted-foreground">完成</div>
                                  <div className="mt-1 text-sm font-medium text-emerald-600">{item.done}</div>
                                </div>
                                <div className="rounded-md bg-muted/40 px-2 py-2">
                                  <div className="text-[10px] text-muted-foreground">失败</div>
                                  <div className="mt-1 text-sm font-medium text-destructive">{item.failed + item.timeout}</div>
                                </div>
                              </div>
                              <div className="mt-3 space-y-1 text-[11px] leading-5 text-muted-foreground">
                                <div>平均耗时：{span(item.avg_ms)}</div>
                                <div>最近执行：{stamp(item.last_run_at)}</div>
                                <div>
                                  阻塞：{item.blocked} | 运行中：{item.running} | 超时：{item.timeout}
                                </div>
                                <div>
                                  通过：{item.pass} | 未通过：{item.fail}
                                </div>
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
                  card("还没有节点日志", "工作流真正运行后，每次节点执行都会按时间顺序显示在这里。")
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const review = parseReview(row)
                      const cfg = nodes.find((item) => item.id === row.node_id)
                      const step = attempts(rows, row.node_id, row.id)

                      return (
                        <section key={row.id} className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate text-sm font-medium text-foreground">
                              {nodeName(nodes, row.node_id)}
                            </div>
                            <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {runLabel(row.status)}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                            <div>节点 ID：{row.node_id}</div>
                            <div>会话：{row.session_id || "-"}</div>
                            <div>
                              尝试：{step.cur} / {cfg ? cfg.retry_limit + 1 : 1}
                            </div>
                            <div>开始：{stamp(row.started_at)}</div>
                            <div>结束：{stamp(row.ended_at)}</div>
                            <div>耗时：{cost(row.started_at, row.ended_at)}</div>
                          </div>

                          {row.status === "blocked" ? (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                              <div>阻塞原因：{blockLabel(row.block_reason)}</div>
                              <div>请求 ID：{row.block_request_id || "-"}</div>
                            </div>
                          ) : null}

                          {review ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
                                <span className="text-xs text-muted-foreground">检查结论</span>
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

                              {review.next_prompt ? (
                                <div className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                                  回写提示：{review.next_prompt}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {row.output && !review ? (
                            <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{row.output}</div>
                          ) : null}

                          {row.output && review ? (
                            <details className="mt-2 rounded-lg border border-dashed border-border/70 px-3 py-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground">查看原始输出</summary>
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
            {props.edge ? <EdgePanel edge={props.edge} onEdgeCond={props.onEdgeCond} onEdgeLabel={props.onEdgeLabel} /> : null}
            {props.node ? (
              <div className={props.edge ? "mt-3" : ""}>
                <WorkflowNodePanel node={props.node} onTitle={props.onNodeTitle} onFields={props.onNodeFields} />
              </div>
            ) : null}
            {!props.edge && !props.node ? (
              card("未选择对象", "点击节点后可以编辑节点属性；点击连线后可以编辑连线条件和标签。")
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
