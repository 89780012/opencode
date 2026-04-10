import { toast } from "sonner"
import { ChatMessageList } from "@/components/chat-message-list"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { PromptBar } from "@/components/chat/prompt-bar"
import { TodoPanel } from "@/components/chat/todo-panel"
import { WaitPanel } from "@/components/workflow/wait-panel"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { useSessionDraft } from "@/hooks/use-session-draft"
import { useSessionFiles } from "@/hooks/use-session-files"
import { useStrategyWorkflowChat } from "@/hooks/use-strategy-workflow-chat"
import type { ComposerModel } from "@/types/composer"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  chat: ReturnType<typeof useStrategyWorkflowChat>
  agent?: string
  models: ComposerModel[]
  model?: string
  variant?: string | null
  variants: string[]
  load?: boolean
  onModel: (value: string) => void
  onVariant: (value: string) => void
  onOpenDiff: (path: string) => void
}

export function StrategyWorkflowPanel(props: Props) {
  const draft = useSessionDraft(props.workspace.path, props.chat.selectedSessionId)
  const files = useSessionFiles(props.workspace.path, props.chat.selectedSessionId)
  const live = !!props.chat.selectedSessionId && props.chat.status.type !== "idle"
  const todo = useChatTodo(props.workspace.path, props.chat.selectedSessionId, live || !!props.chat.openWait)
  const waiting = !!props.chat.openWait
  const bound = !!props.chat.state?.workflow_id && !!props.chat.flow

  const submit = async () => {
    if (files.files.length > 0) {
      toast.error("固定工作流聊天暂不支持图片输入。")
      return
    }

    try {
      await props.chat.submit({
        text: draft.text,
        files: [],
      })
      draft.clear()
      files.clear()
    } catch (err) {
      console.error("提交工作流输入失败", err)
      toast.error("提交工作流输入失败。")
    }
  }

  const empty = !props.chat.sessionLoading && !props.chat.detailLoading && props.chat.messages.length === 0 && !props.chat.eventErr

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatMessageList
            key={`${props.workspace.path}:${props.chat.selectedSessionId ?? "empty"}:workflow`}
            err={props.chat.eventErr || props.chat.err || undefined}
            messages={props.chat.messages}
            loading={props.chat.detailLoading && !!props.chat.selectedSessionId}
            status={props.chat.status}
            onOpenDiff={props.onOpenDiff}
            hideWorkflowInternals
          />
          {empty ? (
            bound ? (
              <ChatEmptyState
                title="从这里开始固定工作流"
                desc="你在这个窗口里发出的每条自然语言消息，都会作为一次新的工作流输入。系统会先经过意图识别，再路由到规划或执行。"
                tips={[
                  "输入新的需求时，系统会在同一个会话里开启新一轮工作流。",
                  "如果当前工作流因为权限或问题阻塞，先处理下方卡片，再继续执行。",
                ]}
              />
            ) : (
              <ChatEmptyState
                title="当前策略尚未绑定固定工作流"
                desc="这个聊天页只负责运行已经绑定好的固定工作流。请先在“新建策略”时选择工作流创建，或为当前策略补充固定工作流绑定。"
                tips={[
                  "普通创建模式仍然走原来的普通策略聊天。",
                  "绑定完成后，这里会固定使用同一个工作流模板来执行每一轮消息。",
                ]}
              />
            )
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-2 pt-1">
        <div className="mx-auto flex max-w-[780px] flex-col gap-2">
          {props.chat.openWait ? (
            <WaitPanel
              key={props.chat.openWait.id}
              wait={props.chat.openWait}
              sending={props.chat.replying}
              onReply={(payload) => {
                void props.chat.reply(props.chat.openWait!.id, payload)
              }}
            />
          ) : null}
          {todo.visible ? <TodoPanel todos={todo.todos} collapsed={todo.collapsed} preview={todo.preview} /> : null}
          <div className="w-full">
            <PromptBar
              agent={props.agent}
              agents={props.agent ? [props.agent] : []}
              busy={false}
              canImage={false}
              disabled={props.load || waiting || !bound}
              files={files.files}
              model={props.model}
              models={props.models}
              onAgent={() => {}}
              onAbort={() => {}}
              onFilesChange={files.setFiles}
              onModel={props.onModel}
              onSubmit={() => {
                void submit()
              }}
              onValueChange={draft.setText}
              onVariant={props.onVariant}
              submitting={props.chat.sending || props.chat.replying || props.chat.sessionLoading || props.chat.creating}
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
