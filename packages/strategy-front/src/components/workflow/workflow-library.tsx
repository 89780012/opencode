import { useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileSearch,
  Hammer,
  MessageSquareText,
  Play,
  Search,
  Square,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { kindAgent, kindDesc, kindPrompt, type WorkflowKind } from "@/types/workflow"

const cut = 16
const init = ["流程控制", "通用回复", "规划智能体", "执行智能体", "检查智能体"]

type Item = {
  kind: WorkflowKind
  title: string
  desc: string
  agent?: string
  prompt?: string
  search: string
}

function build() {
  return [
    {
      title: "流程控制",
      items: [
        {
          kind: "start",
          title: "开始",
          desc: "作为流程入口，读取用户目标和上下文。",
          search: "开始 流程控制 start 入口",
        },
        {
          kind: "router",
          title: "路由",
          desc: "把当前请求路由到回复、规划、执行或检查。",
          agent: kindAgent("router"),
          prompt: kindPrompt("router"),
          search: "路由 router respond plan execute check 分支",
        },
        {
          kind: "end",
          title: "结束",
          desc: "汇总结论并结束整条工作流。",
          search: "结束 流程控制 end 终点",
        },
      ] satisfies Item[],
    },
    {
      title: "通用回复",
      items: [
        {
          kind: "respond",
          title: "回复",
          desc: kindDesc("respond"),
          agent: kindAgent("respond"),
          prompt: kindPrompt("respond"),
          search: "回复 respond chat answer 直接回答",
        },
      ] satisfies Item[],
    },
    {
      title: "规划智能体",
      items: [
        {
          kind: "plan",
          title: "规划",
          desc: kindDesc("plan"),
          agent: kindAgent("plan"),
          prompt: kindPrompt("plan"),
          search: "规划 plan 拆解 交付 风险",
        },
      ] satisfies Item[],
    },
    {
      title: "执行智能体",
      items: [
        {
          kind: "execute",
          title: "执行",
          desc: kindDesc("execute"),
          agent: kindAgent("execute"),
          prompt: kindPrompt("execute"),
          search: "执行 execute 修改 验证 工作区",
        },
      ] satisfies Item[],
    },
    {
      title: "检查智能体",
      items: [
        {
          kind: "check",
          title: "检查",
          desc: kindDesc("check"),
          agent: kindAgent("check"),
          prompt: kindPrompt("check"),
          search: "检查 check pass fail 审查",
        },
      ] satisfies Item[],
    },
  ]
}

function icon(kind: WorkflowKind) {
  if (kind === "start") return <Play className="size-4 text-primary" />
  if (kind === "router") return <Search className="size-4 text-primary" />
  if (kind === "respond") return <MessageSquareText className="size-4 text-primary" />
  if (kind === "plan") return <ClipboardList className="size-4 text-primary" />
  if (kind === "execute") return <Hammer className="size-4 text-amber-500" />
  if (kind === "check") return <FileSearch className="size-4 text-slate-500" />
  return <Square className="size-4 text-amber-500" />
}

function gicon(kinds: WorkflowKind[]) {
  if (kinds.includes("start")) return <Play className="size-3.5 text-muted-foreground" />
  if (kinds.includes("router")) return <Search className="size-3.5 text-muted-foreground" />
  if (kinds.includes("respond")) return <MessageSquareText className="size-3.5 text-muted-foreground" />
  if (kinds.includes("plan")) return <ClipboardList className="size-3.5 text-muted-foreground" />
  if (kinds.includes("execute")) return <Hammer className="size-3.5 text-muted-foreground" />
  if (kinds.includes("check")) return <FileSearch className="size-3.5 text-muted-foreground" />
  return <Square className="size-3.5 text-muted-foreground" />
}

function clip(text: string, max = cut) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

export function WorkflowLibrary(props: { value: string; onValue: (value: string) => void }) {
  const base = useMemo(() => build(), [])
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
              placeholder="搜索节点模板..."
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
                        key={`${group.title}-${item.kind}`}
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
                              <TooltipContent side="right" align="start" sideOffset={8} className="max-w-56 px-2.5 py-1.5 leading-5">
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
                              <TooltipContent side="right" align="start" sideOffset={8} className="max-w-56 px-2.5 py-1.5 leading-5">
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
