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

  const ms = Math.max(0, (to || Date.now()) - from)
  return span(ms)
}

function span(ms?: number) {
  if (!ms || ms <= 0) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round((ms / 1000) * 10) / 10}s`
  if (ms < 3_600_000) return `${Math.round((ms / 60_000) * 10) / 10}m`
  return `${Math.round((ms / 3_600_000) * 10) / 10}h`
}

function runLabel(status?: WorkflowRun["status"] | WorkflowNodeRun["status"]) {
  if (status === "pending") return "Pending"
  if (status === "running") return "Running"
  if (status === "blocked") return "Blocked"
  if (status === "failed") return "Failed"
  if (status === "done") return "Done"
  if (status === "timeout") return "Timeout"
  return "Idle"
}

function passLabel(pass?: boolean) {
  if (pass === true) return "Pass"
  if (pass === false) return "Fail"
  return "Unknown"
}

function blockLabel(value?: string) {
  if (value === "permission") return "Permission"
  if (value === "question") return "Question"
  return value || "-"
}

function sessionLabel(mode?: WorkflowRuntimeNode["session_mode"], key?: string) {
  if (mode === "shared") return "Shared"
  if (mode === "isolated") return "Isolated"
  if (mode === "keyed") return key ? `Keyed: ${key}` : "Keyed"
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
      label: "shared",
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
  const node = props.nodes.find((item) => item.id === props.run?.current_node_id) || null
  const tries = attempts(props.rows, props.current?.node_id || "", props.current?.id)
  const list = lanes(props.run, props.nodes)

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-border/70 bg-sidebar/95 backdrop-blur">
      <Tabs defaultValue="run" className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b border-border/70 px-3 py-3">
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium text-foreground">Workflow Panel</div>
            <div className="text-xs leading-5 text-muted-foreground">
              Inspect the selected run, switch history, answer blocked requests, and trace every node loop.
            </div>
          </div>

          <TabsList className="flex h-10 w-full rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="run" className="h-full flex-1 rounded-lg text-sm">
              Run
            </TabsTrigger>
            <TabsTrigger value="runs" className="h-full flex-1 rounded-lg text-sm">
              History
            </TabsTrigger>
            <TabsTrigger value="stats" className="h-full flex-1 rounded-lg text-sm">
              Stats
            </TabsTrigger>
            <TabsTrigger value="log" className="h-full flex-1 rounded-lg text-sm">
              Log
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="run" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            <div className="space-y-3">
              <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                <div className="text-sm font-medium text-foreground">Run Input</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  This input is sent into the workflow as the root objective for the first runnable node.
                </div>
                <textarea
                  value={props.text}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.onText(event.target.value)}
                  placeholder="Describe the workflow goal for this run..."
                  className="mt-3 min-h-28 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </section>

              <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">Run Status</div>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    {runLabel(props.run?.status)}
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {info("Run ID", props.run?.id || "-")}
                  {info("Current node", props.run?.current_node_id || "-")}
                  {info("Started", stamp(props.run?.started_at))}
                  {info("Ended", stamp(props.run?.ended_at))}
                  {info("Elapsed", cost(props.run?.started_at, props.run?.ended_at))}
                  {info("Node runs", String(props.rows.length))}
                  {info("Shared session", props.run?.root_session_id || "-")}
                  {props.run?.error ? (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                      {props.run.error}
                    </div>
                  ) : null}
                  {props.current?.error ? (
                    <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      Current node error: {props.current.error}
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
                  <div className="text-sm font-medium text-foreground">Current Node</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("Identity", node.title || node.agent || node.kind)}
                    {info("Kind", node.kind)}
                    {info("Session", sessionLabel(node.session_mode, node.session_key))}
                    {info("Session ID", props.current?.session_id || "-")}
                    {info("Attempt", `${Math.max(tries.cur, 1)}/${node.retry_limit + 1}`)}
                    {info("Timeout", node.timeout_ms > 0 ? `${Math.round(node.timeout_ms / 1000)}s` : "Default")}
                    {info("Elapsed", cost(props.current?.started_at, props.current?.ended_at))}
                  </div>
                </section>
              ) : null}

              {list.length > 0 ? (
                <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                  <div className="text-sm font-medium text-foreground">Session Lanes</div>
                  <div className="mt-3 space-y-2">
                    {list.map((item) => (
                      <div key={`${item.label}-${item.session}`} className="rounded-lg border border-border/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="truncate text-muted-foreground">{item.session}</span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.nodes.length > 0 ? item.nodes.map((node) => node.id).join(", ") : "No nodes bound yet"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {props.run?.status === "blocked" ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="text-sm font-medium text-foreground">Blocked Request</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("Reason", blockLabel(props.run.block_reason))}
                    {info("Request ID", props.run.block_request_id || "-")}
                    {info("Node", props.current?.node_id || props.run.current_node_id || "-")}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            {props.runs.length === 0 ? (
              card("No run history yet", "Start this workflow once and every run will be listed here for later inspection.")
            ) : (
              <div className="space-y-3">
                {props.runs.map((item) => {
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
                        <div>Started: {stamp(item.started_at)}</div>
                        <div>Ended: {stamp(item.ended_at)}</div>
                        <div>Elapsed: {cost(item.started_at, item.ended_at)}</div>
                        <div>Current node: {item.current_node_id || "-"}</div>
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
              card("No workflow stats yet", "Workflow analytics will appear here after the summary API returns data.")
            ) : (
              <div className="space-y-3">
                <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                  <div className="text-sm font-medium text-foreground">Workflow Health</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Runs</div>
                      <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_runs}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Node runs</div>
                      <div className="mt-1 text-lg font-medium text-foreground">{props.summary.total_node_runs}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Success</div>
                      <div className="mt-1 text-lg font-medium text-emerald-600">{props.summary.done_runs}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Failed</div>
                      <div className="mt-1 text-lg font-medium text-destructive">{props.summary.failed_runs}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Blocked</div>
                      <div className="mt-1 text-lg font-medium text-amber-600">{props.summary.blocked_runs}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">Running</div>
                      <div className="mt-1 text-lg font-medium text-sky-600">{props.summary.running_runs}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("Average run", span(props.summary.avg_run_ms))}
                    {info("Last run", stamp(props.summary.last_run_at))}
                  </div>
                </section>

                {props.summary.nodes.length === 0 ? (
                  card("No node stats yet", "Run the workflow to accumulate per-node execution analytics.")
                ) : (
                  <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                    <div className="text-sm font-medium text-foreground">Node Analytics</div>
                    <div className="mt-3 space-y-3">
                      {props.summary.nodes.map((item) => (
                        <div key={item.node_id} className="rounded-lg border border-border/70 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">{item.node_id}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {item.title || item.kind}
                              </div>
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
                              <div className="text-[10px] text-muted-foreground">Done</div>
                              <div className="mt-1 text-sm font-medium text-emerald-600">{item.done}</div>
                            </div>
                            <div className="rounded-md bg-muted/40 px-2 py-2">
                              <div className="text-[10px] text-muted-foreground">Failed</div>
                              <div className="mt-1 text-sm font-medium text-destructive">{item.failed + item.timeout}</div>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1 text-[11px] leading-5 text-muted-foreground">
                            <div>Average: {span(item.avg_ms)}</div>
                            <div>Last run: {stamp(item.last_run_at)}</div>
                            <div>Blocked: {item.blocked} | Running: {item.running} | Timeout: {item.timeout}</div>
                            <div>Pass: {item.pass} | Fail: {item.fail}</div>
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
            {props.rows.length === 0 ? (
              card("No node log yet", "After a run starts, every node execution will appear here in time order.")
            ) : (
              <div className="space-y-3">
                {props.rows.map((row) => {
                  const review = parseReview(row)
                  const cfg = props.nodes.find((item) => item.id === row.node_id)
                  const step = attempts(props.rows, row.node_id, row.id)

                  return (
                    <section key={row.id} className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm font-medium text-foreground">{row.node_id}</div>
                        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {runLabel(row.status)}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
                        <div>Session: {row.session_id || "-"}</div>
                        <div>
                          Attempt: {step.cur} / {cfg ? cfg.retry_limit + 1 : 1}
                        </div>
                        <div>Configured session: {sessionLabel(cfg?.session_mode, cfg?.session_key)}</div>
                        <div>Started: {stamp(row.started_at)}</div>
                        <div>Ended: {stamp(row.ended_at)}</div>
                        <div>Elapsed: {cost(row.started_at, row.ended_at)}</div>
                      </div>

                      {row.status === "blocked" ? (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          <div>Reason: {blockLabel(row.block_reason)}</div>
                          <div>Request ID: {row.block_request_id || "-"}</div>
                        </div>
                      ) : null}

                      {review ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
                            <span className="text-xs text-muted-foreground">Review result</span>
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
                              <div className="text-xs text-muted-foreground">Summary</div>
                              <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">
                                {review.summary}
                              </div>
                            </div>
                          ) : null}

                          {review.issues.length > 0 ? (
                            <div className="rounded-lg border border-border/70 px-3 py-2">
                              <div className="text-xs text-muted-foreground">Issues</div>
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
                              Next prompt: {review.next_prompt}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {row.output && !review ? (
                        <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{row.output}</div>
                      ) : null}

                      {row.output && review ? (
                        <details className="mt-2 rounded-lg border border-dashed border-border/70 px-3 py-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">View raw output</summary>
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
