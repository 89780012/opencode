import { useEffect, useMemo } from "react"
import { toast } from "sonner"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatPermission } from "@/hooks/use-chat-permission"
import { useChatQuestion } from "@/hooks/use-chat-question"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { usePromptSubmit } from "@/hooks/use-prompt-submit"
import { useSessionDraft } from "@/hooks/use-session-draft"
import type { ComposerModel } from "@/types/composer"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  agents: string[]
  models: ComposerModel[]
  agent?: string
  model?: string
  variant?: string | null
  variants: string[]
  load?: boolean
  onAgent: (value: string) => void
  onModel: (value: string) => void
  onVariant: (value: string) => void
  onAbort: () => void
  onOpenDiff: (path: string) => void
}

export function StrategyChatPanel(props: Props) {
  useChatEvents(props.workspace.path)

  const { selectedSessionId, loading, creating, createSession, selectSession, sessions, ensureSessions } =
    useChatSessions(props.workspace.path)
  const draft = useSessionDraft(props.workspace.path, selectedSessionId)
  const { messages, status, eventErr, loading: detail } = useChatSessionDetail(props.workspace.path, selectedSessionId)
  const permission = useChatPermission(props.workspace.path, selectedSessionId)
  const question = useChatQuestion(props.workspace.path, selectedSessionId)
  const busy = !!selectedSessionId && status.type !== "idle"
  const live = busy || !!permission.req || !!question.req
  const todo = useChatTodo(props.workspace.path, selectedSessionId, live)
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
    sessionId: selectedSessionId,
    agent: props.agent,
    model: ref,
    variant: props.variant ?? undefined,
    createSession,
    selectSession,
    onSubmitted: draft.clear,
  })

  useEffect(() => {
    void ensureSessions()
  }, [ensureSessions])

  useEffect(() => {
    if (selectedSessionId || sessions.length === 0) return
    selectSession(sessions[0].id)
  }, [selectSession, selectedSessionId, sessions])

  const onSubmit = async (value: string) => {
    if (!props.agent || !ref) {
      toast.error("请先选择模式和模型")
      return
    }

    try {
      await submit(value)
    } catch (err) {
      console.error("Failed to submit prompt", err)
      toast.error("提交失败")
    }
  }

  const empty = !detail && messages.length === 0 && !eventErr

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatMessageList
            key={`${props.workspace.path}:${selectedSessionId ?? "empty"}`}
            err={eventErr}
            messages={messages}
            loading={detail && !!selectedSessionId}
            status={status}
            onOpenDiff={props.onOpenDiff}
          />
          {empty ? (
            <ChatEmptyState
              title="新会话已准备好"
              desc="先用一句话说明你的策略目标、交易思路或希望 AI 帮你完成的任务，下面输入后就会开始生成内容。"
              tips={[
                "例如：帮我写一个 5 分钟级别的突破策略，并控制最大回撤。",
                "例如：基于当前策略继续优化止盈止损，并解释修改原因。",
              ]}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-2 pt-3">
        <div className="mx-auto max-w-[780px] space-y-3">
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
          <div className="max-w-[780px] p-2">
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
              submitting={submitting || creating || loading}
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
