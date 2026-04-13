import { useMemo } from "react"
import { toast } from "sonner"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { StrategyStarterRow } from "@/components/strategy/strategy-starter-row"
import { TodoPanel } from "@/components/chat/todo-panel"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatPermission } from "@/hooks/use-chat-permission"
import { useChatQuestion } from "@/hooks/use-chat-question"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { usePromptSubmit } from "@/hooks/use-prompt-submit"
import { useSessionDraft } from "@/hooks/use-session-draft"
import type { ChatMessageInfo, ChatStatus, PromptInputMessage } from "@/types/chat"
import type { ComposerModel } from "@/types/composer"
import type { LocalWorkspace } from "@/types/workspace"

function done(msg?: ChatMessageInfo) {
  if (!msg || msg.role !== "assistant") return false
  if (msg.finish?.toLowerCase().includes("abort")) return false
  if (!msg.error) return true
  const txt = msg.error.data?.message
  if (typeof txt === "string" && txt.toLowerCase().includes("abort")) return false
  return false
}

interface Props {
  workspace: LocalWorkspace
  selectedSessionId: string | null
  sessionLoading: boolean
  detailLoading: boolean
  messages: ChatMessageInfo[]
  status: ChatStatus
  busy?: boolean
  eventErr?: string
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  variants: string[]
  creating: boolean
  load?: boolean
  showAgent?: boolean
  showModel?: boolean
  onCreate: () => Promise<string>
  onSelectSession: (value: string | null) => void
  onAgent: (value: string) => void
  onModel: (value: string) => void
  onVariant: (value: string) => void
  onAbort: () => void
  onOpenDiff: (path: string) => void
}

export function StrategyChatPanel(props: Props) {
  useChatEvents(props.workspace.path)

  const draft = useSessionDraft(props.workspace.path, props.selectedSessionId)
  const permission = useChatPermission(props.workspace.path, props.selectedSessionId)
  const question = useChatQuestion(props.workspace.path, props.selectedSessionId)
  const busy = props.busy ?? (!!props.selectedSessionId && props.status.type !== "idle")
  const live = busy || !!permission.req || !!question.req
  const todo = useChatTodo(props.workspace.path, props.selectedSessionId, live)
  const last = props.messages[props.messages.length - 1]
  const ref = useMemo(() => {
    if (!props.model) return
    const [providerID, ...rest] = props.model.split("/")
    return {
      providerID,
      modelID: rest.join("/"),
    }
  }, [props.model])
  const { submitting, submit } = usePromptSubmit({
    workspacePath: props.workspace.path,
    sessionId: props.selectedSessionId,
    agent: props.agent,
    model: ref,
    variant: props.variant ?? undefined,
    createSession: props.onCreate,
    selectSession: props.onSelectSession,
    onSubmitted: () => {
      draft.clear()
    },
  })

  const onSubmit = async (msg: PromptInputMessage) => {
    if (!props.agent || !ref) {
      toast.error("请先选择智能体和模型。")
      return
    }

    try {
      await submit(msg)
    } catch (err) {
      console.error("Failed to submit prompt", err)
      toast.error("提交失败。")
    }
  }

  const empty = !props.sessionLoading && !props.detailLoading && props.messages.length === 0 && !props.eventErr
  const ready = !busy && !submitting && !props.creating && !props.sessionLoading
  const suggest =
    !empty &&
    ready &&
    !props.eventErr &&
    !permission.req &&
    !question.req &&
    done(last) &&
    !!props.agent &&
    !!ref &&
    !props.load

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatMessageList
            key={`${props.workspace.path}:${props.selectedSessionId ?? "empty"}`}
            err={props.eventErr}
            messages={props.messages}
            loading={props.detailLoading && !!props.selectedSessionId}
            status={props.status}
            onOpenDiff={props.onOpenDiff}
            footer={
              suggest ? (
                <StrategyStarterRow
                  onRun={(text) => {
                    void onSubmit({ text })
                  }}
                />
              ) : null
            }
          />
          {empty ? (
            <ChatEmptyState
              title="新会话已准备好"
              desc="先用一句话说明你的策略目标、交易思路，或希望 AI 帮你完成的任务，下面输入后就会开始生成内容。"
              tips={[
                "例如：帮我写一个 5 分钟级别的突破策略，并控制最大回撤。",
                "例如：基于当前策略继续优化止盈止损，并解释修改原因。",
              ]}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-2 pt-1">
        <div className="mx-auto flex max-w-[780px] flex-col gap-1.5">
          {permission.req ? (
            <PermissionPanel
              key={permission.req.id}
              req={permission.req}
              sending={permission.sending}
              onReject={() => {
                void permission.allow("reject")
              }}
              onAllow={(value) => {
                void permission.allow(value)
              }}
            />
          ) : null}
          {question.req ? (
            <QuestionPanel
              key={question.req.id}
              req={question.req}
              sending={question.sending}
              onReject={() => {
                void question.reject()
              }}
              onReply={(answers) => {
                void question.reply(answers)
              }}
            />
          ) : null}
          {todo.visible ? <TodoPanel todos={todo.todos} collapsed={todo.collapsed} preview={todo.preview} /> : null}
          <div className="w-full">
            <PromptBar
              agent={props.agent}
              agents={props.agents}
              busy={busy}
              disabled={props.load}
              model={props.model}
              models={props.models}
              onAgent={props.onAgent}
              onAbort={props.onAbort}
              onModel={props.onModel}
              onSubmit={(value) => {
                void onSubmit(value)
              }}
              onValueChange={draft.setText}
              onVariant={props.onVariant}
              showAgent={props.showAgent}
              showModel={props.showModel}
              submitting={submitting || props.creating || props.sessionLoading}
              value={draft.text}
              variant={props.variant}
              variants={props.variants}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
