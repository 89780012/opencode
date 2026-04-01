import { useCallback, useEffect, useMemo, useState } from "react"
import { FolderCode, Plus, Square } from "lucide-react"
import { toast } from "sonner"
import { chatApi } from "@/api/modules"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailDialog } from "@/components/workspace/workspace-detail-dialog"
import { useWorkspaceList } from "@/data/global-data-provider"
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
}

export function GroupChatPanel(props: Props) {
  useChatEvents(props.workspace.path)

  const { select } = useWorkspaceList()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const {
    selectedSessionId,
    loading,
    creating,
    createSession,
    selectSession,
    sessions,
    ensureSessions,
  } = useChatSessions(props.workspace.path)
  const sessionDraft = useSessionDraft(props.workspace.path, selectedSessionId)
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
    onSubmitted: sessionDraft.clear,
  })

  useEffect(() => {
    void ensureSessions()
  }, [ensureSessions])

  useEffect(() => {
    if (selectedSessionId || sessions.length === 0) return
    selectSession(sessions[0].id)
  }, [selectSession, selectedSessionId, sessions])

  const current = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )

  const onSubmit = async (value: string) => {
    if (!props.agent || !ref) {
      toast.error("请先选择 Agent 和模型")
      return
    }

    try {
      await submit(value)
    } catch (err) {
      console.error("Failed to submit prompt", err)
      toast.error("提交失败")
    }
  }

  const onAbort = async () => {
    if (!selectedSessionId || !busy) return
    try {
      await chatApi.abortSession(props.workspace.path, selectedSessionId)
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止失败")
    }
  }

  const onCreate = useCallback(async () => {
    try {
      await createSession()
    } catch (err) {
      console.error("Failed to create session", err)
      toast.error("创建会话失败")
    }
  }, [createSession])

  const openDiff = useCallback((path: string) => {
    setFile(path)
    setOpen(true)
  }, [])

  return (
    <>
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{props.workspace.name}</div>
            <div className="truncate text-xs text-muted-foreground">{current?.title || "暂无会话"}</div>
          </div>
          <Select value={selectedSessionId ?? ""} onValueChange={selectSession} disabled={sessions.length === 0}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder={sessions.length === 0 ? "暂无会话" : "选择会话"} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title || "未命名会话"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void onCreate()} disabled={creating}>
            <Plus className="size-4" />
            新会话
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              select(props.workspace)
              setOpen(true)
            }}
          >
            <FolderCode className="size-4" />
            查看代码
          </Button>
          {busy ? (
            <Button variant="outline" size="sm" onClick={() => void onAbort()}>
              <Square className="size-4" />
              停止
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatMessageList
            key={`${props.workspace.path}:${selectedSessionId ?? "empty"}`}
            err={eventErr}
            messages={messages}
            loading={detail && !!selectedSessionId}
            status={status}
            onOpenDiff={openDiff}
          />
        </div>

        <div className="shrink-0 border-t px-3 py-3">
          <div className="space-y-3">
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
            <PromptBar
              agent={props.agent}
              agents={props.agents}
              busy={busy}
              disabled={props.load}
              model={props.model}
              models={props.models}
              onAgent={props.onAgent}
              onAbort={() => {
                void onAbort()
              }}
              onModel={props.onModel}
              onSubmit={(value) => {
                void onSubmit(value)
              }}
              onValueChange={sessionDraft.setText}
              onVariant={props.onVariant}
              submitting={submitting || creating || loading}
              value={sessionDraft.text}
              variant={props.variant}
              variants={props.variants}
            />
          </div>
        </div>
      </section>

      <WorkspaceDetailDialog
        open={open}
        workspace={props.workspace}
        sessionId={selectedSessionId}
        file={file}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) {
            setFile(null)
          }
        }}
      />
    </>
  )
}
