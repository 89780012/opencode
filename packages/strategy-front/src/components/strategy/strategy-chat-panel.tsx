import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { StrategyStarterRow } from "@/components/strategy/strategy-starter-row"
import { TodoPanel } from "@/components/chat/todo-panel"
import { useChatRuntime } from "@/hooks/use-chat-runtime"
import type { ChatMessageInfo, ChatStatus } from "@/types/chat"
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
  const chat = useChatRuntime({
    workspacePath: props.workspace.path,
    sessionId: props.selectedSessionId,
    status: props.status,
    busy: props.busy,
    agent: props.agent,
    model: props.model,
    variant: props.variant,
    createSession: props.onCreate,
    selectSession: props.onSelectSession,
  })
  const last = props.messages[props.messages.length - 1]
  const empty = !props.sessionLoading && !props.detailLoading && props.messages.length === 0 && !props.eventErr
  const ready = !chat.busy && !chat.submitting && !props.creating && !props.sessionLoading
  const suggest =
    !empty &&
    ready &&
    !props.eventErr &&
    !chat.permission.req &&
    !chat.question.req &&
    done(last) &&
    !!props.agent &&
    !!props.model &&
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
                    void chat.submit({ text })
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
          {chat.permission.req ? (
            <PermissionPanel
              key={chat.permission.req.id}
              req={chat.permission.req}
              sending={chat.permission.sending}
              onReject={() => {
                void chat.permission.allow("reject")
              }}
              onAllow={(value) => {
                void chat.permission.allow(value)
              }}
            />
          ) : null}
          {chat.question.req ? (
            <QuestionPanel
              key={chat.question.req.id}
              req={chat.question.req}
              sending={chat.question.sending}
              onReject={() => {
                void chat.question.reject()
              }}
              onReply={(answers) => {
                void chat.question.reply(answers)
              }}
            />
          ) : null}
          {chat.todo.visible ? (
            <TodoPanel todos={chat.todo.todos} collapsed={chat.todo.collapsed} preview={chat.todo.preview} />
          ) : null}
          <div className="w-full">
            <PromptBar
              agent={props.agent}
              agents={props.agents}
              busy={chat.busy}
              disabled={props.load}
              model={props.model}
              models={props.models}
              onAgent={props.onAgent}
              onAbort={props.onAbort}
              onModel={props.onModel}
              onSubmit={(value) => {
                void chat.submit(value)
              }}
              onValueChange={chat.draft.setText}
              onVariant={props.onVariant}
              showAgent={props.showAgent}
              showModel={props.showModel}
              submitting={chat.submitting || props.creating || props.sessionLoading}
              value={chat.draft.text}
              variant={props.variant}
              variants={props.variants}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
