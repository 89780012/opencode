import { type ChangeEvent } from "react"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { QuestionPanel } from "@/components/chat/question-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ChatQuestionAnswer, ChatQuestionRequest, PermissionRequest } from "@/types/chat"
import type { WorkflowNodeRun, WorkflowRun, WorkflowRuntimeNode, WorkflowSummary } from "@/types/workflow"

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

type Props = {
  text: string
  run: WorkflowRun | null
  runs: WorkflowRun[]
  summary: WorkflowSummary | null
  rows: WorkflowNodeRun[]
  current: WorkflowNodeRun | null
  nodes: WorkflowRuntimeNode[]
  permission: PermissionRequest | null
  question: ChatQuestionRequest | null
  sending: boolean
  onPickRun: (id: string) => void
  onPermission: (reply: "once" | "always" | "reject") => void
  onQuestion: (answers: ChatQuestionAnswer[]) => void
  onRejectQuestion: () => void
  onText: (value: string) => void
}

function stamp(value?: number) {
  if (!value) return "-"
  return fmt.format(new Date(value))
}

function cost(from?: number, to?: number) {
  if (!from) return "-"
  return span(Math.max(0, (to || Date.now()) - from))
}

function span(ms?: number) {
  if (!ms || ms <= 0) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round((ms / 1000) * 10) / 10}s`
  if (ms < 3_600_000) return `${Math.round((ms / 60_000) * 10) / 10}m`
  return `${Math.round((ms / 3_600_000) * 10) / 10}h`
}

function runLabel(status?: WorkflowRun["status"] | WorkflowNodeRun["status"]) {
  if (status === "pending") return "等待中"
  if (status === "running") return "运行中"
  if (status === "blocked") return "已阻塞"
  if (status === "failed") return "失败"
  if (status === "done") return "完成"
  if (status === "timeout") return "超时"
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

function sessionLabel(mode?: WorkflowRuntimeNode["session_mode"], key?: string) {
  if (mode === "shared") return "共享会话"
  if (mode === "isolated") return "独立会话"
  if (mode === "keyed") return key ? `命名会话：${key}` : "命名会话"
  return "-"
}

function parseReview(row: WorkflowNodeRun) {
  const text = row.result.structured?.trim()
  if (!text) return null

  try {
    const data = JSON.parse(text) as {
      pass?: boolean
      summary?: string
      next_prompt?: string
      issues?: string[]
    }
    return {
      pass: typeof data.pass === "boolean" ? data.pass : row.result.pass,
      summary: typeof data.summary === "string" ? data.summary.trim() : row.result.text?.trim(),
      next_prompt: typeof data.next_prompt === "string" ? data.next_prompt.trim() : row.result.next_prompt?.trim(),
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
      <span className="max-w-40 truncate text-right font-medium text-foreground">{value || "-"}</span>
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

function lanes(run: WorkflowRun | null, nodes: WorkflowRuntimeNode[]) {
  if (!run) return []

  const out = []
  if (run.root_session_id) {
    out.push({
      label: "共享",
      session: run.root_session_id,
      nodes: nodes.filter((item) => item.session_mode === "shared"),
    })
  }
  for (const [key, value] of Object.entries(run.lanes || {})) {
    out.push({
      label: key,
      session: value,
      nodes: nodes.filter((item) => item.session_mode === "keyed" && item.session_key === key),
    })
  }
  return out
}

export function WorkflowSidepanel(props: Props) {
  const runs = props.runs || []
  const rows = props.rows || []
  const nodes = props.nodes || []
  const stats = props.summary?.nodes || []
  const node = nodes.find((item) => item.id === props.run?.current_node_id) || null
  const tries = attempts(rows, props.current?.node_id || "", props.current?.id)
  const list = lanes(props.run, nodes)

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-border/70 bg-sidebar/95 backdrop-blur">
      <Tabs defaultValue="run" className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b border-border/70 px-3 py-3">
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium text-foreground">工作流面板</div>
            <div className="text-xs leading-5 text-muted-foreground">
              这里可以查看当前运行、切换历史记录、处理阻塞请求，并追踪每个节点的循环执行情况。
            </div>
          </div>

          <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="run" className="h-full rounded-lg text-sm">
              运行
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
              <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                <div className="text-sm font-medium text-foreground">运行输入</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  这里的内容会作为本次工作流的根输入，发送给第一个可执行节点。
                </div>
                <textarea
                  value={props.text}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.onText(event.target.value)}
                  placeholder="描述这次工作流要完成的目标..."
                  className="mt-3 min-h-28 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </section>

              <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">运行状态</div>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    {runLabel(props.run?.status)}
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {info("运行 ID", props.run?.id || "-")}
                  {info("当前节点", props.run?.current_node_id || "-")}
                  {info("开始时间", stamp(props.run?.started_at))}
                  {info("结束时间", stamp(props.run?.ended_at))}
                  {info("运行耗时", cost(props.run?.started_at, props.run?.ended_at))}
                  {info("节点记录", String(rows.length))}
                  {info("共享会话", props.run?.root_session_id || "-")}
                  {props.run?.error ? (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                      {props.run.error}
                    </div>
                  ) : null}
                  {props.current?.error ? (
                    <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      当前节点错误：{props.current.error}
                    </div>
                  ) : null}
                </div>
              </section>

              {props.permission ? (
                <PermissionPanel
                  req={props.permission}
                  sending={props.sending}
                  onReject={() => props.onPermission("reject")}
                  onAllow={(value) => props.onPermission(value)}
                />
              ) : null}

              {props.question ? (
                <QuestionPanel
                  req={props.question}
                  sending={props.sending}
                  onReply={props.onQuestion}
                  onReject={props.onRejectQuestion}
                />
              ) : null}

              {node ? (
                <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                  <div className="text-sm font-medium text-foreground">当前节点</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("身份", node.title || node.agent || node.kind)}
                    {info("类型", node.kind)}
                    {info("会话模式", sessionLabel(node.session_mode, node.session_key))}
                    {info("会话 ID", props.current?.session_id || "-")}
                    {info("尝试次数", `${Math.max(tries.cur, 1)}/${node.retry_limit + 1}`)}
                    {info("超时", node.timeout_ms > 0 ? `${Math.round(node.timeout_ms / 1000)} 秒` : "默认")}
                    {info("节点耗时", cost(props.current?.started_at, props.current?.ended_at))}
                  </div>
                </section>
              ) : null}

              {list.length > 0 ? (
                <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                  <div className="text-sm font-medium text-foreground">会话复用</div>
                  <div className="mt-3 space-y-2">
                    {list.map((item) => (
                      <div key={`${item.label}-${item.session}`} className="rounded-lg border border-border/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="truncate text-muted-foreground">{item.session}</span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.nodes.length > 0 ? item.nodes.map((node) => node.id).join("、") : "当前还没有绑定节点"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {props.run?.status === "blocked" ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="text-sm font-medium text-foreground">阻塞详情</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("阻塞原因", blockLabel(props.run.block_reason))}
                    {info("请求 ID", props.run.block_request_id || "-")}
                    {info("阻塞节点", props.current?.node_id || props.run.current_node_id || "-")}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            {runs.length === 0 ? (
              card("还没有运行记录", "启动一次工作流后，这里会按时间顺序展示历史运行。")
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
                        <div>开始：{stamp(item.started_at)}</div>
                        <div>结束：{stamp(item.ended_at)}</div>
                        <div>耗时：{cost(item.started_at, item.ended_at)}</div>
                        <div>当前节点：{item.current_node_id || "-"}</div>
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
              card("还没有统计信息", "当工作流产生运行数据后，这里会展示整体健康度和各节点统计。")
            ) : (
              <div className="space-y-3">
                <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                  <div className="text-sm font-medium text-foreground">工作流健康度</div>
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
                              <div className="truncate text-sm font-medium text-foreground">{item.node_id}</div>
                              <div className="truncate text-[11px] text-muted-foreground">{item.title || item.kind}</div>
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
                              阻塞：{item.blocked} · 运行中：{item.running} · 超时：{item.timeout}
                            </div>
                            <div>
                              通过：{item.pass} · 未通过：{item.fail}
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
              card("还没有节点日志", "工作流启动后，每次节点执行都会按时间顺序显示在这里。")
            ) : (
              <div className="space-y-3">
                {rows.map((row) => {
                  const review = parseReview(row)
                  const cfg = nodes.find((item) => item.id === row.node_id)
                  const step = attempts(rows, row.node_id, row.id)

                  return (
                    <section key={row.id} className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm font-medium text-foreground">{row.node_id}</div>
                        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {runLabel(row.status)}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                        <div>会话：{row.session_id || "-"}</div>
                        <div>
                          尝试：{step.cur} / {cfg ? cfg.retry_limit + 1 : 1}
                        </div>
                        <div>配置会话：{sessionLabel(cfg?.session_mode, cfg?.session_key)}</div>
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
    </aside>
  )
}
