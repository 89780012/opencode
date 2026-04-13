import { toast } from "sonner"
import { ChatMessageList } from "@/components/chat-message-list"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { PromptBar } from "@/components/chat/prompt-bar"
import { StrategyStarterRow } from "@/components/strategy/strategy-starter-row"
import { TodoPanel } from "@/components/chat/todo-panel"
import { WaitPanel } from "@/components/workflow/wait-panel"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { useSessionDraft } from "@/hooks/use-session-draft"
import { useSessionFiles } from "@/hooks/use-session-files"
import { useStrategyWorkflowChat } from "@/hooks/use-strategy-workflow-chat"
import type { ChatMessageInfo } from "@/types/chat"
import type { ComposerModel } from "@/types/composer"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  chat: ReturnType<typeof useStrategyWorkflowChat>
  models: ComposerModel[]
  model?: string
  variant?: string | null
  variants: string[]
  load?: boolean
  onModel: (value: string) => void
  onVariant: (value: string) => void
  onOpenDiff: (path: string) => void
}

const chip =
  "rounded-full border border-black/8 bg-black/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"

function current(rows: Props["chat"]["rows"], id?: string) {
  return (
    rows.find((item) => item.status === "running" || item.status === "waiting") ||
    rows.find((item) => item.node_id === id) ||
    rows[0] ||
    null
  )
}

function done(msg?: ChatMessageInfo) {
  if (!msg || msg.role !== "assistant") return false
  if (msg.finish?.toLowerCase().includes("abort")) return false
  if (!msg.error) return true
  const txt = msg.error.data?.message
  if (typeof txt === "string" && txt.toLowerCase().includes("abort")) return false
  return false
}

export function StrategyWorkflowPanel(props: Props) {
  const draft = useSessionDraft(props.workspace.path, props.chat.selectedSessionId)
  const files = useSessionFiles(props.workspace.path, props.chat.selectedSessionId)
  const todo = useChatTodo(props.workspace.path, props.chat.selectedSessionId, props.chat.busy || !!props.chat.openWait)
  const bound = !!props.chat.state?.workflow_id && !!props.chat.flow
  const last = props.chat.messages[props.chat.messages.length - 1]
  const row = current(props.chat.rows, props.chat.run?.current_node_id)
  const node = props.chat.flow?.nodes.find((item) => item.id === (row?.node_id || props.chat.run?.current_node_id)) ?? null
  const source = node?.model_provider_id && node?.model_id ? "node override" : "workspace default"

  const send = async (text = draft.text) => {
    const body = text.trim()
    if (!body) return

    if (files.files.length > 0) {
      toast.error("固定工作流会话暂不支持图片输入。")
      return
    }

    try {
      await props.chat.submit({
        text: body,
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
  const ready =
    !props.chat.busy &&
    !props.chat.sending &&
    !props.chat.replying &&
    !props.chat.interrupting &&
    !props.chat.sessionLoading &&
    !props.chat.creating
  const suggest =
    bound &&
    !empty &&
    ready &&
    !props.load &&
    !props.chat.err &&
    !props.chat.eventErr &&
    !props.chat.openWait &&
    done(last)

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
            footer={
              suggest ? (
                <StrategyStarterRow
                  onRun={(text) => {
                    void send(text)
                  }}
                />
              ) : null
            }
          />
          {empty ? (
            bound ? (
              <ChatEmptyState
                title="从这里开始运行工作流"
                desc="你在这里发送的每条自然语言消息，都会作为新一轮工作流输入。实际执行时使用的是工作流节点自己的 Agent。"
                tips={[
                  "这里的模型选择器会修改工作区绑定的默认模型，影响后续工作流运行。",
                  "如果某个节点配置了自己的模型覆盖，仍然会优先使用节点模型。",
                ]}
              />
            ) : (
              <ChatEmptyState
                title="当前策略还没有绑定工作流"
                desc="这个页面只负责运行已经绑定到当前策略工作区的工作流。"
                tips={[
                  "请先在创建策略时选择工作流模式，或先完成工作流绑定。",
                  "Agent 选择在工作流节点上，这里不再提供单独切换。",
                ]}
              />
            )
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-2 pt-1">
        <div className="mx-auto flex max-w-[780px] flex-col gap-2">
          {bound ? (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <div className={chip}>Agent 由工作流节点控制</div>
              <div className={chip}>{`当前节点：${node?.title || "-"}`}</div>
              <div className={chip}>{`节点智能体：${node?.agent || "-"}`}</div>
              <div className={chip}>{`模型来源：${source === "node override" ? "节点覆盖" : "工作区默认"}`}</div>
            </div>
          ) : null}
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
              agents={[]}
              busy={props.chat.busy || props.chat.interrupting}
              canImage={false}
              disabled={props.load || !bound}
              files={files.files}
              model={props.model}
              models={props.models}
              onAgent={() => {}}
              onAbort={() => {
                void props.chat.interrupt()
              }}
              onFilesChange={files.setFiles}
              onModel={props.onModel}
              onSubmit={() => {
                void send()
              }}
              onValueChange={draft.setText}
              onVariant={props.onVariant}
              showAgent={false}
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
