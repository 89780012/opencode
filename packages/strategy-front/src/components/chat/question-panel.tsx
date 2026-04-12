import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ChatQuestionAnswer, ChatQuestionRequest } from "@/types/chat"

interface Props {
  req: ChatQuestionRequest
  sending?: boolean
  onReply: (answers: ChatQuestionAnswer[]) => void
  onReject: () => void
}

export function QuestionPanel(props: Props) {
  const [answers, setAnswers] = useState<ChatQuestionAnswer[]>(() => props.req.questions.map(() => []))
  const [texts, setTexts] = useState<string[]>(() => props.req.questions.map(() => ""))
  const [extra, setExtra] = useState<boolean[]>(() => props.req.questions.map(() => false))

  const pick = (q: number, label: string, multi: boolean) => {
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item
        if (!multi) return [label]
        return item.includes(label) ? item.filter((v) => v !== label) : [...item, label]
      }),
    )
  }

  const write = (q: number, value: string, multi: boolean) => {
    setTexts((prev) => prev.map((item, i) => (i === q ? value : item)))
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item
        const next = item.filter((v) => v !== texts[q])
        if (!extra[q] || !value.trim()) return next
        if (!multi) return [value.trim()]
        return next.includes(value.trim()) ? next : [...next, value.trim()]
      }),
    )
  }

  const toggle = (q: number, multi: boolean) => {
    const on = !extra[q]
    setExtra((prev) => prev.map((item, i) => (i === q ? on : item)))
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item
        const text = texts[q]?.trim()
        if (!text) return item
        if (!on) return item.filter((v) => v !== text)
        if (!multi) return [text]
        return item.includes(text) ? item : [...item, text]
      }),
    )
  }

  const many = props.req.questions.length > 1

  return (
    <Card className="mb-3 gap-3 py-4">
      <CardHeader className="gap-2 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>需要你确认几个问题</CardTitle>
            <CardDescription>当前任务被问题阻塞，回答后会继续执行。</CardDescription>
          </div>
          <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{props.req.questions.length} 个问题</div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs className="gap-2" defaultValue="0">
          {many ? (
            <div className="overflow-x-auto pb-1">
              <TabsList className="min-w-full justify-start gap-1">
                {props.req.questions.map((item, i) => (
                  <TabsTrigger key={`${props.req.id}:${i}`} value={`${i}`} className="max-w-48 shrink-0">
                    <span className="truncate text-xs">
                      {i + 1}. {item.header}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          ) : null}
          {props.req.questions.map((item, i) => {
            const multi = item.multiple === true
            const allow = item.custom !== false
            const chosen = answers[i] ?? []
            const text = texts[i] ?? ""
            const on = extra[i] === true

            return (
              <TabsContent key={`${props.req.id}:${i}`} value={`${i}`}>
                <div className="rounded-lg border p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{item.header}</div>
                      <div className="text-sm text-muted-foreground">{item.question}</div>
                    </div>
                    <div className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {multi ? "可多选" : "单选"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {item.options.map((opt) => {
                      const hit = chosen.includes(opt.label)
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          aria-pressed={hit}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors outline-none",
                            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                            hit ? "border-primary/60 bg-accent/50 text-foreground" : "border-border bg-background hover:bg-accent/30",
                          )}
                          disabled={props.sending}
                          onClick={() => pick(i, opt.label, multi)}
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                              multi ? "rounded-sm" : "rounded-full",
                              hit ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
                            )}
                          >
                            {hit ? <div className={cn("bg-primary-foreground", multi ? "size-2 rounded-[2px]" : "size-2 rounded-full")} /> : null}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm font-medium">{opt.label}</div>
                            <div className="text-sm text-muted-foreground">{opt.description}</div>
                          </div>
                        </button>
                      )
                    })}
                    {allow ? (
                      <div
                        className={cn(
                          "rounded-md border px-3 py-2.5 transition-colors",
                          on ? "border-primary/60 bg-accent/40" : "border-border bg-background",
                        )}
                      >
                        <button
                          type="button"
                          className="mb-2 flex w-full items-center gap-2.5 text-left"
                          disabled={props.sending}
                          onClick={() => toggle(i, multi)}
                        >
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-md border",
                              on ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
                            )}
                          >
                            {on ? <div className="size-2 rounded-[2px] bg-primary-foreground" /> : null}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">自定义输入</div>
                            <div className="text-xs text-muted-foreground">开启后可直接填写答案</div>
                          </div>
                        </button>
                        <Input disabled={!on || props.sending} onChange={(e) => write(i, e.target.value, multi)} placeholder="输入你的答案" value={text} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button disabled={props.sending} type="button" variant="outline" onClick={props.onReject}>
          取消
        </Button>
        <Button disabled={props.sending} type="button" onClick={() => props.onReply(answers)}>
          提交答案
        </Button>
      </CardFooter>
    </Card>
  )
}
