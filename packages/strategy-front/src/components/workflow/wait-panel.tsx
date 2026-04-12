import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ChatQuestionRequest, PermissionRequest } from "@/types/chat"
import type { WorkflowWait } from "@/types/workflow"

interface Props {
  wait: WorkflowWait
  sending?: boolean
  onReply: (payload: unknown) => void
}

function question(wait: WorkflowWait) {
  if (wait.kind !== "question" || !wait.schema || typeof wait.schema !== "object") return
  const item = wait.schema as ChatQuestionRequest
  if (!Array.isArray(item.questions)) return
  return item
}

function permission(wait: WorkflowWait) {
  if (wait.kind !== "permission" || !wait.schema || typeof wait.schema !== "object") return
  const item = wait.schema as PermissionRequest
  if (!item.id) return
  return item
}

export function WaitPanel(props: Props) {
  const ask = useMemo(() => question(props.wait), [props.wait])
  const grant = useMemo(() => permission(props.wait), [props.wait])
  const [answers, setAnswers] = useState<string[]>(() => ask?.questions.map(() => "") ?? [""])

  if (grant) {
    return (
      <Card className="mb-3 gap-3 py-4">
        <CardHeader className="gap-2 pb-0">
          <CardTitle>等待权限确认</CardTitle>
          <CardDescription>{props.wait.prompt || grant.permission}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>权限：{grant.permission}</div>
          {grant.patterns.length > 0 ? <div>匹配范围：{grant.patterns.join(", ")}</div> : null}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button disabled={props.sending} type="button" variant="outline" onClick={() => props.onReply({ reply: "reject" })}>
            拒绝
          </Button>
          <Button disabled={props.sending} type="button" variant="outline" onClick={() => props.onReply({ reply: "once" })}>
            仅允许一次
          </Button>
          <Button disabled={props.sending} type="button" onClick={() => props.onReply({ reply: "always" })}>
            始终允许
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (ask) {
    return (
      <Card className="mb-3 gap-3 py-4">
        <CardHeader className="gap-2 pb-0">
          <CardTitle>等待问题回复</CardTitle>
          <CardDescription>{props.wait.prompt || "请补充当前步骤所需的信息。"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ask.questions.map((item, i) => (
            <div key={`${props.wait.id}:${i}`} className="space-y-2">
              <div className="text-sm font-medium">{item.header}</div>
              <div className="text-sm text-muted-foreground">{item.question}</div>
              <Input
                disabled={props.sending}
                onChange={(event) => setAnswers((prev) => prev.map((row, j) => (j === i ? event.target.value : row)))}
                placeholder="输入回复"
                value={answers[i] ?? ""}
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={props.sending || answers.some((item) => !item.trim())}
            type="button"
            onClick={() => props.onReply({ answers: answers.map((item) => [item.trim()]) })}
          >
            提交回复
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="mb-3 gap-3 py-4">
      <CardHeader className="gap-2 pb-0">
        <CardTitle>{props.wait.title || "等待输入"}</CardTitle>
        <CardDescription>{props.wait.prompt || "当前步骤正在等待外部输入。"}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button disabled type="button">
          暂不支持
        </Button>
      </CardFooter>
    </Card>
  )
}
