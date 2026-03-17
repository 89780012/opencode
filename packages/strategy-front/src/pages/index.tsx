import { useEffect, useState } from "react"
import { FolderOpen, History, Plus } from "lucide-react"
import { toast } from "sonner"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChatComposer } from "@/hooks/use-chat-composer"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatPermission } from "@/hooks/use-chat-permission"
import { useChatQuestion } from "@/hooks/use-chat-question"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { usePromptSubmit } from "@/hooks/use-prompt-submit"
import { useAppSelector } from "@/hooks/useAppSelector"
import { cn } from "@/lib/utils"

export default function Home() {
  const workspace = useAppSelector((state) => state.workspaceView.selectedWorkspace)
  const version = useAppSelector((state) => state.workspaceView.version)
  const workspacePath = workspace?.path ?? null
  const [input, setInput] = useState("")

  //当前目录事件监听
  useChatEvents(workspacePath)

  const {
    sessions,
    selectedSessionId,
    loading: sessionLoading,
    creating,
    refreshSessions,
    createSession,
    selectSession,
  } = useChatSessions(workspacePath)
  const composer = useChatComposer(workspacePath, selectedSessionId)
  const { messages, status, err, loading: messageLoading } = useChatSessionDetail(workspacePath, selectedSessionId)
  const permission = useChatPermission(workspacePath, selectedSessionId, composer.accepting)
  const question = useChatQuestion(workspacePath, selectedSessionId)
  const { submitting, submit } = usePromptSubmit({
    workspacePath,
    sessionId: selectedSessionId,
    agent: composer.state?.agent,
    model: composer.state?.model,
    variant: composer.state?.variant,
    createSession,
    refreshSessions,
    selectSession: (sessionId) => selectSession(sessionId),
    onSubmitted: () => setInput(""),
  })
  const empty = !selectedSessionId || (!messageLoading && status.type !== "busy" && messages.length === 0)

  useEffect(() => {
    if (!workspacePath) return
    void refreshSessions()
  }, [refreshSessions, version, workspacePath])

  const handleSubmit = async (value: string) => {
    if (!workspacePath) {
      toast.error("请先选择工作空间")
      return
    }
    if (!composer.state?.agent || !composer.state?.model) {
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

  return (
    <div className="flex h-full w-full min-w-0">
      {/* {workspace ? (
        <div className="min-w-0 flex-1">
          <WorkspaceEditorPane workspace={workspace} />
        </div>
      ) : null} */}

      <div className={cn("relative flex h-full min-w-0 flex-col", "w-full")}>
        {
          <div className="px-4 py-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedSessionId ?? ""}
                  onValueChange={(value) => {
                    selectSession(value || null)
                  }}
                  disabled={!workspace || sessions.length === 0}
                >
                  <SelectTrigger className="h-9 w-52 px-3 text-left text-sm text-white shadow-none">
                    <div className="flex min-w-0 items-center gap-2">
                      <History className="size-4 shrink-0 text-zinc-400" />
                      <SelectValue placeholder="历史会话" />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {sessions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => selectSession(null)} disabled={!workspace}>
                  <Plus className="size-4" />
                  新建会话
                </Button>
              </div>
            </div>
          </div>
        }

        {!workspace ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">请先选择工作空间</div>
              <p className="text-sm text-muted-foreground">
                工作空间决定当前会话绑定的代码目录。选择后，第一条消息会自动创建新会话。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1">
              <ChatMessageList
                err={err}
                messages={messages}
                loading={messageLoading && !!selectedSessionId}
                status={status}
              />

              {empty ? (
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <div className="max-w-md space-y-3 text-center">
                    <div className="text-xl font-semibold">开始新会话</div>
                    <p className="text-sm text-muted-foreground">
                      可以继续历史会话，或者直接发送第一条消息，在当前工作空间中创建新会话。
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0">
              <div className="mx-auto w-full max-w-[768px] space-y-3 px-4 py-2">
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
                {
                  <PromptBar
                    agent={composer.state?.agent}
                    agents={composer.agents}
                    accepting={composer.accepting}
                    disabled={!workspace || composer.load}
                    model={
                      composer.state?.model
                        ? `${composer.state.model.providerID}/${composer.state.model.modelID}`
                        : undefined
                    }
                    models={composer.models}
                    onAgent={composer.setAgent}
                    onModel={composer.setModel}
                    onPermission={composer.togglePermission}
                    onSubmit={(value) => {
                      void handleSubmit(value)
                    }}
                    onValueChange={setInput}
                    onVariant={composer.setVariant}
                    submitting={submitting || creating || sessionLoading}
                    value={input}
                    variant={composer.state?.variant}
                    vars={composer.vars}
                  />
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
