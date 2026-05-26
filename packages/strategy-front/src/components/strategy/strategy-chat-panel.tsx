import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { useChatRuntime } from "@/hooks/use-chat-runtime"
import type { ChatMessageInfo, ChatStatus } from "@/types/chat"
import type { LocalWorkspace } from "@/types/workspace"
import { useAppDispatch } from "@/store"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"

interface Props {
  workspace: LocalWorkspace
  selectedSessionId: string | null
  detailLoading: boolean
  messages: ChatMessageInfo[]
  status: ChatStatus
  busy?: boolean
  eventErr?: string
  creating: boolean
  load?: boolean
  onCreate: () => Promise<string>
  onSelectSession: (value: string | null) => void
  onAbort: () => void
  onOpenDiff: (path: string) => void
}

export function StrategyChatPanel(props: Props) {
  const chat = useChatRuntime({
    workspacePath: props.workspace.path,
    sessionId: props.selectedSessionId,
    status: props.status,
    busy: props.busy,
    createSession: props.onCreate,
    selectSession: props.onSelectSession,
  })
  const dispatch = useAppDispatch()
  const empty = !props.detailLoading && props.messages.length === 0
  const lock = chat.busy || chat.submitting || props.creating || props.load
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatMessageList
            key={`${props.workspace.path}:${props.selectedSessionId ?? "empty"}`}
            loading={props.detailLoading && !!props.selectedSessionId}
            messages={props.messages}
            onOpenDiff={props.onOpenDiff}
            status={props.status}
          />
          {empty ? (
            <ChatEmptyState
              disabled={lock}
              onPick={(text) => {
                void chat.submit({ text })
              }}
              title="想先研究哪类策略？"
              tips={[
                "帮我设计一个日内突破策略，包含进出场、止损和仓位控制",
                "帮我生成一个基于 EMA 和 RSI 的趋势跟随策略",
                "帮我调试当前策略，定位信号和风控问题",
                "帮我回测这个策略，并总结收益、回撤和胜率",
                "帮我分析这个策略的缺陷，并给出优化建议",
                "帮我完善一个均值回归策略，补全过滤条件和风控规则",
              ]}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2 md:px-4">
        <div className="mx-auto flex max-w-[780px] flex-col gap-2">
          {chat.permission.req ? (
            <PermissionPanel
              key={chat.permission.req.id}
              onAllow={(value) => {
                void chat.permission.allow(value)
              }}
              onReject={() => {
                void chat.permission.allow("reject")
              }}
              req={chat.permission.req}
              sending={chat.permission.sending}
            />
          ) : null}
          {chat.question.req ? (
            <QuestionPanel
              key={chat.question.req.id}
              onReject={() => {
                void chat.question.reject()
              }}
              onReply={(answers) => {
                void chat.question.reply(answers)
              }}
              req={chat.question.req}
              sending={chat.question.sending}
            />
          ) : null}
          {chat.todo.visible ? (
            <TodoPanel todos={chat.todo.todos} collapsed={chat.todo.collapsed} preview={chat.todo.preview} />
          ) : null}
          <div className="w-full">
            <PromptBar
              busy={chat.busy}
              disabled={props.load}
              onAbort={props.onAbort}
              onSubmit={(value) => {
                dispatch(updateSessionAbortStatus({ sessionId: props.selectedSessionId || "", status: false }))
                void chat.submit(value)
              }}
              onValueChange={chat.draft.setText}
              submitting={chat.submitting || props.creating}
              value={chat.draft.text}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
