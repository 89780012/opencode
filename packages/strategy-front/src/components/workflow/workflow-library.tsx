import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ClipboardList, FileSearch, Hammer, PauseCircle, Search } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { WorkflowKind } from "@/types/workflow"

const cut = 28
const init = ["Core", "Control"]

const workflowLibrary: {
  title: string
  items: { kind: WorkflowKind; title: string; desc: string }[]
}[] = [
  {
    title: "Core",
    items: [
      { kind: "plan", title: "Plan", desc: "Break the request into a concrete implementation plan." },
      { kind: "build", title: "Build", desc: "Implement or revise code in the shared workspace." },
      { kind: "review", title: "Review", desc: "Review current code and emit structured pass/fail feedback." },
    ],
  },
  {
    title: "Control",
    items: [{ kind: "gate", title: "Gate", desc: "Pause for a manual decision before continuing." }],
  },
]

function icon(kind: WorkflowKind) {
  if (kind === "plan") return <ClipboardList className="size-4 text-primary" />
  if (kind === "build") return <Hammer className="size-4 text-amber-500" />
  if (kind === "review") return <FileSearch className="size-4 text-slate-500" />
  return <PauseCircle className="size-4 text-slate-500" />
}

function gicon(kinds: WorkflowKind[]) {
  if (kinds.includes("plan") || kinds.includes("build") || kinds.includes("review")) {
    return <ClipboardList className="size-3.5 text-muted-foreground" />
  }
  return <PauseCircle className="size-3.5 text-muted-foreground" />
}

function clip(text: string) {
  if (text.length <= cut) return text
  return `${text.slice(0, cut)}...`
}

export function WorkflowLibrary(props: { value: string; onValue: (value: string) => void }) {
  const list = useMemo(() => {
    const key = props.value.trim().toLowerCase()
    return workflowLibrary
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!key) return true
          return item.title.toLowerCase().includes(key) || item.desc.toLowerCase().includes(key)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [props.value])
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
              placeholder="Search nodes..."
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
              {all ? "Collapse all" : "Expand all"}
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
                        }}
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">{icon(item.kind)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-foreground">{item.title}</div>
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
        </div>
      </ScrollArea>
    </aside>
  )
}
