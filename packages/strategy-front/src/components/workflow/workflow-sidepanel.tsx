import { type ChangeEvent } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WorkflowNodeRun, WorkflowRun } from "@/types/workflow"

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

type Props = {
  text: string
  run: WorkflowRun | null
  rows: WorkflowNodeRun[]
  current: WorkflowNodeRun | null
  onText: (value: string) => void
}

function stamp(value?: number) {
  if (!value) return "-"
  return fmt.format(new Date(value))
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

export function WorkflowSidepanel(props: Props) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-border/70 bg-sidebar/95 backdrop-blur">
      <Tabs defaultValue="run" className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b border-border/70 px-3 py-3">
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium text-foreground">工作流面板</div>
            <div className="text-xs leading-5 text-muted-foreground">
              这里展示启动输入、运行状态，以及每个节点的执行记录。
            </div>
          </div>

          <TabsList className="flex h-10 w-full rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="run" className="h-full flex-1 rounded-lg text-sm">
              运行
            </TabsTrigger>
            <TabsTrigger value="log" className="h-full flex-1 rounded-lg text-sm">
              记录
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="run" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            <div className="space-y-3">
              <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                <div className="text-sm font-medium text-foreground">运行输入</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  这里会作为工作流根输入，发送给第一个节点。
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
                  {info("当前节点", props.run?.current_node_id || "-")}
                  {info("开始时间", stamp(props.run?.started_at))}
                  {info("节点记录", String(props.rows.length))}
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

              {props.run?.status === "blocked" ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="text-sm font-medium text-foreground">阻塞详情</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {info("阻塞类型", blockLabel(props.run.block_reason))}
                    {info("请求 ID", props.run.block_request_id || "-")}
                    {info("阻塞节点", props.current?.node_id || props.run.current_node_id || "-")}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="log" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full overflow-y-auto p-3">
            {props.rows.length === 0 ? (
              card("暂无运行记录", "执行工作流后，节点结果会按时间顺序显示在这里。")
            ) : (
              <div className="space-y-3">
                {props.rows.map((row) => {
                  const review = parseReview(row)

                  return (
                    <section key={row.id} className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm font-medium text-foreground">{row.node_id}</div>
                        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {runLabel(row.status)}
                        </div>
                      </div>

                      <div className="mt-2 break-all text-[11px] leading-5 text-muted-foreground">
                        会话：{row.session_id || "-"}
                      </div>

                      {row.status === "blocked" ? (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          <div>阻塞类型：{blockLabel(row.block_reason)}</div>
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
                              <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">
                                {review.summary}
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

                          {review.next_prompt ? (
                            <div className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                              回写提示词：{review.next_prompt}
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
