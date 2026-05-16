import { useMemo, useState } from "react"
import { Loader2, MessageSquareMore, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { QuestionEntry } from "@/hooks/use-workspace-questions"

interface Props {
  open: boolean
  loaded: boolean
  busy?: boolean
  err?: string | null
  questions: QuestionEntry[]
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
  onSelect: (item: QuestionEntry) => void
}

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export function WorkspaceQuestionsPanel(props: Props) {
  const [q, setQ] = useState("")
  const list = useMemo(() => {
    const text = q.trim().toLowerCase()
    if (!text) {
      return props.questions
    }

    return props.questions.filter((item) => item.text.toLowerCase().includes(text))
  }, [props.questions, q])

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[380px] gap-0 p-0 sm:max-w-[380px]" showCloseButton>
        <SheetHeader className="gap-3 border-b px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <SheetTitle>工作区问题记录</SheetTitle>
              <SheetDescription>自动汇总当前工作区后续提交的问题，可搜索并跳转到对应会话。</SheetDescription>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">总数 {props.questions.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索问题或会话"
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={props.onRefresh} disabled={props.busy}>
              <RefreshCw className={cn("size-4", props.busy && "animate-spin")} />
              刷新
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          {!props.loaded ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              正在加载问题记录...
            </div>
          ) : props.err ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">读取问题记录失败</div>
                <div className="text-sm leading-6 text-muted-foreground">{props.err}</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={props.onRefresh} disabled={props.busy}>
                <RefreshCw className={cn("size-4", props.busy && "animate-spin")} />
                重试
              </Button>
            </div>
          ) : list.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-3xl bg-muted">
                <MessageSquareMore className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {props.questions.length === 0 ? "还没有任何问题记录" : "没有匹配的问题"}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {props.questions.length === 0
                    ? "所有你提交的问题会自动记录在这里，方便你随时查看和跳转到对应的会话。"
                    : "可以尝试更换关键词，或者清空搜索条件后再试。"}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-170px)]">
              <div className="space-y-2 px-3 py-3">
                {list.map((item) => (
                  <button
                    key={`${item.sessionId}:${item.messageId}:${item.createdAt}`}
                    type="button"
                    onClick={() => props.onSelect(item)}
                    className="w-full rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:hover:border-[#2a312f] dark:hover:bg-[#151918]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <MessageSquareMore className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="line-clamp-2 text-sm leading-6 font-medium text-foreground">{item.text}</div>
                        <div className="text-xs text-muted-foreground">{fmt.format(new Date(item.createdAt))}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
