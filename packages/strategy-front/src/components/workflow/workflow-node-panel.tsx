import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useGlobalData, useSkillList } from "@/data/global-data-provider"
import { kindRole, workflowField, type WorkflowField, type WorkflowFlowNode } from "@/types/workflow"

type Props = {
  node: WorkflowFlowNode | null
  onTitle: (value: string) => void
  onFields: (value: WorkflowField[]) => void
}

const tone = "text-xs font-medium text-foreground"

function toggle(list: string[], value: string, checked: boolean) {
  if (checked) return list.includes(value) ? list : [...list, value]
  return list.filter((item) => item !== value)
}

function options(item: WorkflowField, names: string[], q: string) {
  if (item.kind !== "multi") return []
  const list = item.key === workflowField.skills ? names : (item.options ?? [])
  const key = q.trim().toLowerCase()
  return list.filter((opt) => {
    const value = typeof opt === "string" ? opt : opt.value
    const text = typeof opt === "string" ? opt : opt.label
    if (!key) return true
    return value.toLowerCase().includes(key) || text.toLowerCase().includes(key)
  })
}

function save(list: WorkflowField[], idx: number, next: WorkflowField) {
  return list.map((item, i) => (i === idx ? next : item))
}

export function WorkflowNodePanel(props: Props) {
  const data = useGlobalData()
  const skills = useSkillList()
  const [q, setQ] = useState("")
  const node = props.node

  const role = node ? kindRole(node.data.kind) : undefined
  const agents = [
    ...data.agent.data.cfg.agents
      .filter((item) => item.mode !== "subagent" && !item.hidden && (!role || item.workflow_role === role))
      .map((item) => ({ label: item.name, value: item.name })),
    ...data.agent.data.run
      .filter((item) => item.mode !== "subagent" && !item.hidden && (!role || item.workflow_role === role))
      .map((item) => ({ label: item.name, value: item.name })),
  ]

  const opts = (item: WorkflowField) => {
    if (item.kind !== "select") {
      return []
    }
    if (item.key === workflowField.agent) {
      const cur = item.value ? [{ label: item.value, value: item.value }] : []
      return [...new Map([...agents, ...cur].map((row) => [row.value, row])).values()]
    }
    return item.options ?? [item.value]
  }

  if (!node) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-3 py-4 text-sm text-muted-foreground">
        <div className="text-sm font-medium text-foreground">未选择节点</div>
        <div className="mt-2 leading-6">点击画布中的任意工作流节点后，这里会显示该节点的可编辑属性。</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border/70 bg-background/85 px-3 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-foreground">节点属性</div>
          <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {node.data.kind}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground">节点 ID: {node.id}</div>

        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className={tone}>节点标题</div>
            <Input value={node.data.title} onChange={(event) => props.onTitle(event.target.value)} placeholder="输入节点标题" />
          </div>

          {node.data.fields.map((item, idx) => {
            if (item.kind === "text") {
              return (
                <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                  <div className={tone}>{item.label}</div>
                  <Input
                    value={item.value}
                    onChange={(event) => props.onFields(save(node.data.fields, idx, { ...item, value: event.target.value }))}
                  />
                </div>
              )
            }

            if (item.kind === "select") {
              return (
                <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                  <div className={tone}>{item.label}</div>
                  <select
                    value={item.value}
                    onChange={(event) => props.onFields(save(node.data.fields, idx, { ...item, value: event.target.value }))}
                    className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary/40"
                  >
                    {opts(item).map((opt: string | { label: string; value: string }) => (
                      <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
                        {typeof opt === "string" ? opt : opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            if (item.kind === "multi") {
              const list = options(item, skills.names, q)

              return (
                <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className={tone}>{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">已选 {item.value.length} 项</div>
                  </div>
                  <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜索可选项" />
                  <div className="rounded-md border border-dashed border-border/70 bg-muted/25 px-2 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.value.length > 0 ? (
                        item.value.map((row) => (
                          <span
                            key={row}
                            className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                          >
                            <span className="max-w-[220px] truncate">{row}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground">还没有选择任何项</span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[180px] space-y-1 overflow-y-auto rounded-md border border-border/70 bg-background p-2">
                    {skills.load && item.key === workflowField.skills ? (
                      <div className="px-1 py-2 text-[12px] text-muted-foreground">正在加载技能列表...</div>
                    ) : null}

                    {list.length > 0 ? (
                      list.map((opt) => {
                        const value = typeof opt === "string" ? opt : opt.value
                        const text = typeof opt === "string" ? opt : opt.label
                        return (
                          <label key={value} className="flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-foreground hover:bg-muted/40">
                            <input
                              type="checkbox"
                              checked={item.value.includes(value)}
                              onChange={(event) =>
                                props.onFields(
                                  save(node.data.fields, idx, {
                                    ...item,
                                    value: toggle(item.value, value, event.target.checked),
                                  }),
                                )
                              }
                              className="size-4 shrink-0 rounded border-border/80"
                            />
                            <span className="min-w-0 flex-1 truncate">{text}</span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="px-1 py-2 text-[12px] text-muted-foreground">
                        {skills.err && item.key === workflowField.skills ? skills.err : "没有匹配的可选项"}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            if (item.kind === "checks") {
              return (
                <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                  <div className={tone}>{item.label}</div>
                  <div className="space-y-1 rounded-md border border-border/70 bg-background p-2">
                    {item.items.map((row, i) => (
                      <label key={`${row.label}-${i}`} className="flex items-center gap-2 text-[13px] text-foreground">
                        <input
                          type="checkbox"
                          checked={!!row.checked}
                          onChange={(event) =>
                            props.onFields(
                              save(node.data.fields, idx, {
                                ...item,
                                items: item.items.map((entry, hit) =>
                                  hit === i ? { ...entry, checked: event.target.checked } : entry,
                                ),
                              }),
                            )
                          }
                          className="size-4 rounded border-border/80"
                        />
                        <span>{row.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            }

            if (item.kind === "range") {
              return (
                <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                  <div className={tone}>{item.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={item.from}
                      onChange={(event) => props.onFields(save(node.data.fields, idx, { ...item, from: event.target.value }))}
                      placeholder="起始值"
                    />
                    <Input
                      value={item.to}
                      onChange={(event) => props.onFields(save(node.data.fields, idx, { ...item, to: event.target.value }))}
                      placeholder="结束值"
                    />
                  </div>
                </div>
              )
            }

            return (
              <div key={`${node.id}-${item.key}-${idx}`} className="space-y-2">
                <div className={tone}>{item.label}</div>
                <textarea
                  value={item.value}
                  onChange={(event) => props.onFields(save(node.data.fields, idx, { ...item, value: event.target.value }))}
                  className="min-h-[120px] w-full resize-none rounded-md border border-border/70 bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/40"
                  placeholder="输入详细内容"
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
