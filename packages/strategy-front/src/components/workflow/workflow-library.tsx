import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileSearch,
  GitBranch,
  Hammer,
  PauseCircle,
  Play,
  Search,
  Square,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useGlobalData } from "@/data/global-data-provider"
import { cn } from "@/lib/utils"
import { kindDesc, kindPrompt, type WorkflowKind } from "@/types/workflow"
import type { GlobalAgent, RuntimeAgent, WorkflowAgentRole } from "@/types/agent"

const cut = 16
const init = ["流程控制", "规划智能体", "执行智能体", "检查智能体"]

type Item = {
  kind: WorkflowKind
  title: string
  desc: string
  agent?: string
  prompt?: string
  search: string
}

type AgentRow = {
  name: string
  description?: string
  hidden?: boolean
  mode?: "subagent" | "primary" | "all"
  workflow_role?: WorkflowAgentRole
}

function has(text: string, list: string[]) {
  return list.some((item) => text.includes(item))
}

function infer(item: AgentRow): WorkflowKind {
  if (item.name === "intent") return "intent"
  if (item.workflow_role === "planner") return "plan"
  if (item.workflow_role === "checker") return "review"
  if (item.workflow_role === "executor") return "build"

  const text = `${item.name} ${item.description || ""}`.toLowerCase()
  if (has(text, ["checker", "check", "review", "verify", "lint", "test", "audit", "检查", "审查", "校验"])) {
    return "review"
  }
  if (has(text, ["planner", "plan", "design", "规划", "计划"])) {
    return "plan"
  }
  if (has(text, ["intent", "意图识别", "路由"])) {
    return "intent"
  }
  return "build"
}

function group(kind: WorkflowKind) {
  if (kind === "plan") return "规划智能体"
  if (kind === "review") return "检查智能体"
  return "执行智能体"
}

function note(item: AgentRow, kind: WorkflowKind) {
  const text = item.description?.trim()
  if (text) return text
  if (kind === "intent") return `${item.name} 负责根据当前消息判断应先规划、执行还是检查。`
  if (kind === "plan") return `${item.name} 负责拆解目标并输出执行计划。`
  if (kind === "review") return `${item.name} 负责检查结果，并返回 pass/fail。`
  return `${item.name} 负责在工作区中实施修改、执行任务或产出内容。`
}

function merge(run: RuntimeAgent[], cfg: GlobalAgent[]) {
  const map = new Map<string, AgentRow>()

  for (const item of cfg) {
    map.set(item.name, {
      name: item.name,
      description: item.description,
      hidden: item.hidden,
      mode: item.mode,
      workflow_role: item.workflow_role,
    })
  }

  for (const item of run) {
    const prev = map.get(item.name)
    map.set(item.name, {
      name: item.name,
      description: prev?.description || item.description,
      hidden: prev?.hidden || item.hidden,
      mode: prev?.mode === "subagent" ? prev.mode : item.mode,
      workflow_role: prev?.workflow_role || item.workflow_role,
    })
  }

  return [...map.values()]
    .filter((item) => !item.hidden && item.mode !== "subagent")
    .sort((a, b) => a.name.localeCompare(b.name))
}

function build(list: AgentRow[]) {
  const map = new Map<string, Item[]>()

  map.set("流程控制", [
    {
      kind: "start",
      title: "开始",
      desc: "作为流程入口，整理输入与上下文后进入下一节点。",
      agent: "operator",
      prompt: kindPrompt("start"),
      search: "开始 起点 启动 start",
    },
    {
      kind: "end",
      title: "结束",
      desc: "汇总最终结果，作为流程终点结束执行。",
      agent: "operator",
      prompt: kindPrompt("end"),
      search: "结束 终点 完成 end",
    },
    {
      kind: "judge",
      title: "路由判断",
      desc: "内置判断节点，根据当前结果输出 pass/fail 并决定下一条边。",
      agent: "reviewer",
      prompt: kindPrompt("judge"),
      search: "路由 判断 分支 judge pass fail",
    },
  ])

  for (const item of list) {
    const kind = infer(item)
    const key = group(kind)
    const row = {
      kind,
      title: item.name,
      desc: note(item, kind),
      agent: item.name,
      prompt: kindPrompt(kind),
      search: `${item.name} ${item.description || ""} ${kindDesc(kind)}`,
    } satisfies Item
    map.set(key, [...(map.get(key) || []), row])
  }

  return init
    .map((item) => ({
      title: item,
      items: map.get(item) || [],
    }))
    .filter((item) => item.items.length > 0)
}

function icon(kind: WorkflowKind) {
  if (kind === "start") return <Play className="size-4 text-primary" />
  if (kind === "intent") return <Search className="size-4 text-primary" />
  if (kind === "plan") return <ClipboardList className="size-4 text-primary" />
  if (kind === "build") return <Hammer className="size-4 text-amber-500" />
  if (kind === "judge") return <GitBranch className="size-4 text-slate-500" />
  if (kind === "review") return <FileSearch className="size-4 text-slate-500" />
  if (kind === "end") return <Square className="size-4 text-amber-500" />
  return <PauseCircle className="size-4 text-slate-500" />
}

function gicon(kinds: WorkflowKind[]) {
  if (kinds.includes("start")) return <Play className="size-3.5 text-muted-foreground" />
  if (kinds.includes("intent")) return <Search className="size-3.5 text-muted-foreground" />
  if (kinds.includes("judge")) return <GitBranch className="size-3.5 text-muted-foreground" />
  if (kinds.includes("review")) return <FileSearch className="size-3.5 text-muted-foreground" />
  if (kinds.includes("plan")) return <ClipboardList className="size-3.5 text-muted-foreground" />
  if (kinds.includes("build")) return <Hammer className="size-3.5 text-muted-foreground" />
  if (kinds.includes("end")) return <Square className="size-3.5 text-muted-foreground" />
  return <PauseCircle className="size-3.5 text-muted-foreground" />
}

function clip(text: string, max = cut) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

export function WorkflowLibrary(props: { value: string; onValue: (value: string) => void }) {
  const data = useGlobalData()
  const ensure = data.ensure

  useEffect(() => {
    void ensure("agent")
  }, [ensure])

  const rows = useMemo(
    () => merge(data.agent.data.run, data.agent.data.cfg.agents),
    [data.agent.data.cfg.agents, data.agent.data.run],
  )
  const base = useMemo(() => build(rows), [rows])
  const list = useMemo(() => {
    const key = props.value.trim().toLowerCase()
    return base
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!key) return true
          return [item.title, item.desc, item.search].some((row) => row.toLowerCase().includes(key))
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [base, props.value])
  const [open, setOpen] = useState<string[]>(init)
  const full = list.map((group) => group.title)
  const all = full.length > 0 && full.every((item) => open.includes(item))

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={props.value}
              onChange={(event) => props.onValue(event.target.value)}
              placeholder="搜索节点或智能体..."
              className="h-8 rounded-md border-border/80 bg-background pl-9 text-[13px] shadow-none"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setOpen(all ? [] : full)}
              >
                {all ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {all ? "全部收起" : "全部展开"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 py-3">
          {data.agent.err ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {data.agent.err}
            </div>
          ) : null}
          {data.agent.load ? <div className="mb-3 px-2 text-xs text-muted-foreground">正在加载可用智能体...</div> : null}
          <Accordion type="multiple" value={open} onValueChange={setOpen} className="w-full">
            {list.map((group) => (
              <AccordionItem key={group.title} value={group.title} className="border-b-0">
                <AccordionTrigger className="rounded-md px-2 py-2 text-[13px] text-foreground hover:bg-muted/40 hover:no-underline">
                  <span className="flex items-center gap-2">
                    {gicon(group.items.map((item) => item.kind))}
                    <span>{group.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1.5 px-1">
                    {group.items.map((item) => (
                      <button
                        key={`${group.title}-${item.title}`}
                        type="button"
                        draggable
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md border border-[#d8e3ff] bg-white px-2 py-2 text-left transition-colors",
                          "hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
                        )}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "copy"
                          event.dataTransfer.setData("application/opencode-workflow", item.kind)
                          event.dataTransfer.setData(
                            "application/opencode-workflow-node",
                            JSON.stringify({
                              kind: item.kind,
                              title: item.title,
                              desc: item.desc,
                              agent: item.agent,
                              prompt: item.prompt,
                            }),
                          )
                        }}
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">{icon(item.kind)}</div>
                        <div className="min-w-0 flex-1">
                          {item.title.length > cut ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate text-[13px] font-medium text-foreground">{clip(item.title)}</div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="start"
                                sideOffset={8}
                                className="max-w-56 px-2.5 py-1.5 leading-5"
                              >
                                {item.title}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="truncate text-[13px] font-medium text-foreground">{item.title}</div>
                          )}
                          {item.desc.length > cut ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{clip(item.desc)}</div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="start"
                                sideOffset={8}
                                className="max-w-56 px-2.5 py-1.5 leading-5"
                              >
                                {item.desc}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.desc}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {list.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
              没有匹配的节点。
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  )
}
