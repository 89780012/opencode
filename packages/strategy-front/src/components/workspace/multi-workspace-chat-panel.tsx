import { useCallback, useEffect, useState } from "react"
import { FolderCode, Plus, Square } from "lucide-react"
import { toast } from "sonner"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailPane, type WorkspaceDetailTab } from "@/components/workspace/workspace-detail-pane"
import { useChatRuntime } from "@/hooks/use-chat-runtime"
import { useStrategySession } from "@/hooks/use-strategy-session"
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
  onLoad?: (value: boolean) => void
}

const ctrl =
  "rounded-xl border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

export function MultiWorkspaceChatPanel(props: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceDetailTab>("files")
  const chat = useStrategySession(props.workspace.path)
  const feed = useChatRuntime({
    workspacePath: props.workspace.path,
    sessionId: chat.selectedSessionId,
    status: chat.status,
    busy: chat.busy,
    agent: props.agent,
    model: props.model,
    variant: props.variant,
    createSession: chat.createSession,
    selectSession: chat.selectSession,
  })

  useEffect(() => {
    props.onLoad?.(chat.sessionLoading && chat.sessions.length === 0)
  }, [chat.sessionLoading, chat.sessions.length, props])

  const onAbort = async () => {
    try {
      await chat.abortSession()
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止失败")
    }
  }

  const onCreate = useCallback(async () => {
    try {
      await chat.createSession()
    } catch (err) {
      console.error("Failed to create session", err)
      toast.error("新建会话失败")
    }
  }, [chat])

  const empty = !chat.detailLoading && chat.messages.length === 0 && !chat.eventErr

  return (
    <>
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
        <div className="shrink-0 px-2 py-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-muted-foreground">{props.workspace.name}</div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Select
                value={chat.selectedSessionId ?? ""}
                onValueChange={chat.selectSession}
                disabled={chat.sessions.length === 0}
              >
                <SelectTrigger className={`h-7 w-[164px] ${ctrl}`}>
                  <SelectValue placeholder={chat.sessions.length === 0 ? "暂无会话" : "选择会话"} />
                </SelectTrigger>
                <SelectContent>
                  {chat.sessions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title || "未命名会话"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 ${ctrl}`}
                onClick={() => void onCreate()}
                disabled={chat.creating}
              >
                <Plus className="size-4" />
                新建
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 ${ctrl}`}
                onClick={() => {
                  setFile(null)
                  setTab("files")
                  setOpen(true)
                }}
              >
                <FolderCode className="size-4" />
                代码
              </Button>
              {chat.busy ? (
                <Button variant="outline" size="sm" className={`h-7 ${ctrl}`} onClick={() => void onAbort()}>
                  <Square className="size-4" />
                  停止
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden px-1.5">
          <ChatMessageList
            key={`${props.workspace.path}:${chat.selectedSessionId ?? "empty"}`}
            err={chat.eventErr}
            messages={chat.messages}
            loading={chat.detailLoading && !!chat.selectedSessionId}
            status={chat.status}
            onOpenDiff={(path) => {
              setFile(path)
              setTab("review")
              setOpen(true)
            }}
          />
          {empty ? (
            <ChatEmptyState
              title="这一栏还没有对话"
              desc="可以把这一栏当成一个独立的策略位，直接描述当前要研究的方向，让 AI 并行推进不同策略。"
              tips={[
                "例如：这一栏专门做趋势策略，重点处理入场和加仓。",
                "例如：这一栏负责均值回归版本，并和其它栏形成不同思路对比。",
              ]}
            />
          ) : null}
        </div>

        <div className="shrink-0 px-4 pb-1.5 pt-0.5">
          <div className="flex w-full flex-col gap-1.5">
            {feed.permission.req ? (
              <PermissionPanel
                key={feed.permission.req.id}
                req={feed.permission.req}
                sending={feed.permission.sending}
                onReject={() => {
                  void feed.permission.allow("reject")
                }}
                onAllow={(value) => {
                  void feed.permission.allow(value)
                }}
              />
            ) : null}
            {feed.question.req ? (
              <QuestionPanel
                key={feed.question.req.id}
                req={feed.question.req}
                sending={feed.question.sending}
                onReject={() => {
                  void feed.question.reject()
                }}
                onReply={(answers) => {
                  void feed.question.reply(answers)
                }}
              />
            ) : null}
            {feed.todo.visible ? (
              <TodoPanel todos={feed.todo.todos} collapsed={feed.todo.collapsed} compact preview={feed.todo.preview} />
            ) : null}
            <div className="w-full">
              <PromptBar
                agent={props.agent}
                agents={props.agents}
                busy={chat.busy}
                compact
                disabled={props.load}
                model={props.model}
                models={props.models}
                onAgent={props.onAgent}
                onAbort={() => {
                  void onAbort()
                }}
                onModel={props.onModel}
                onSubmit={(value) => {
                  void feed.submit(value)
                }}
                onValueChange={feed.draft.setText}
                onVariant={props.onVariant}
                submitting={feed.submitting || chat.creating || chat.sessionLoading}
                value={feed.draft.text}
                variant={props.variant}
                variants={props.variants}
              />
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) {
            setFile(null)
            setTab("files")
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(900px,calc(100dvh-28px))] max-h-[calc(100dvh-28px)] w-[min(1400px,calc(100vw-28px))] max-w-[calc(100vw-28px)] min-w-0 flex-col gap-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#fcfcfa] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.14)] dark:border-[#252e2b] dark:bg-[#101514]"
        >
          <WorkspaceDetailPane
            open={open}
            tab={tab}
            workspace={props.workspace}
            sessionId={chat.selectedSessionId}
            file={file}
            onTab={setTab}
            onOpenChange={(value) => {
              setOpen(value)
              if (!value) {
                setFile(null)
                setTab("files")
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
