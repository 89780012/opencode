import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FolderOpen } from "lucide-react"
import { toast } from "sonner"
import { chatApi } from "@/api/modules"
import { ChatWorkspacePanel } from "@/components/chat/chat-workspace-panel"
import { ChatWorkspaceToggle } from "@/components/chat/chat-workspace-toggle"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useAgentCatalog } from "@/hooks/use-agent-catalog"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatPermission } from "@/hooks/use-chat-permission"
import { useChatQuestion } from "@/hooks/use-chat-question"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { useProviderCatalog } from "@/hooks/use-provider-catalog"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { usePromptSubmit } from "@/hooks/use-prompt-submit"
import { useSessionDraft } from "@/hooks/use-session-draft"
import { useAppSelector } from "@/hooks/useAppSelector"
import { resolveComposer } from "@/lib/chat-composer"

export default function Home() {
  const workspace = useAppSelector((state) => state.workspaceView.selectedWorkspace)
  const path = workspace?.path ?? null
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const root = useRef<HTMLDivElement | null>(null)

  useChatEvents(path)

  const { selectedSessionId, loading, creating, refreshSessions, createSession, selectSession } = useChatSessions(path)
  const ags = useAgentCatalog(path)
  const prv = useProviderCatalog()
  const project = useProjectComposer(path)
  const draft = useSessionDraft(path, selectedSessionId)
  const composer = useMemo(
    () =>
      resolveComposer({
        ags: ags.ags,
        prv,
        cur: project.state,
      }),
    [ags.ags, project.state, prv],
  )
  const { messages, status, err, loading: detail } = useChatSessionDetail(path, selectedSessionId)
  const permission = useChatPermission(path, selectedSessionId)
  const question = useChatQuestion(path, selectedSessionId)
  const { submitting, submit } = usePromptSubmit({
    workspacePath: path,
    sessionId: selectedSessionId,
    agent: composer.agent?.name,
    model: composer.model,
    variant: composer.variant,
    createSession,
    refreshSessions,
    selectSession,
    onSubmitted: draft.clear,
  })
  const busy = !!selectedSessionId && status.type !== "idle"
  const live = busy || !!permission.req || !!question.req
  const todo = useChatTodo(path, selectedSessionId, live)
  const empty = !selectedSessionId || (!detail && status.type !== "busy" && messages.length === 0)
  const load = ags.load || prv.load
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined

  const setAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) return
      project.setAgent(value)
    },
    [ags.ags, project],
  )

  const setModel = useCallback(
    (value: string) => {
      const [providerID, ...rest] = value.split("/")
      const modelID = rest.join("/")
      if (!prv.all.some((item) => item.provider.id === providerID && item.id === modelID)) return
      project.setModel({ providerID, modelID })
    },
    [project, prv.all],
  )

  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  useEffect(() => {
    const node = root.current
    if (!node) {
      return
    }

    const sync = () => {
      setWide(node.clientWidth >= 900)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  const onSubmit = async (value: string) => {
    if (!path) {
      toast.error("请先选择工作区")
      return
    }
    if (!composer.agent?.name || !composer.model) {
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
    if (!path || !selectedSessionId || !busy) {
      return
    }

    try {
      await chatApi.abortSession(path, selectedSessionId)
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止失败")
    }
  }

  const show = !!workspace && open
  const split = !!workspace && wide
  const overlay = show && !wide
  const chat = (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <ChatMessageList
          err={err}
          messages={messages}
          loading={detail && !!selectedSessionId}
          status={status}
          hasCache={messages.length > 0}
        />

        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="max-w-md space-y-3 text-center">
              <div className="text-xl font-semibold">开始新会话</div>
              <p className="text-sm text-muted-foreground">
                请先在左侧选择历史会话，或发送第一条消息创建当前工作区的新会话。
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
          {todo.visible ? (
            <TodoPanel
              key={selectedSessionId ?? "todo"}
              todos={todo.todos}
              collapsed={todo.collapsed}
              preview={todo.preview}
            />
          ) : null}
          <PromptBar
            agent={composer.agent?.name}
            agents={ags.names}
            busy={busy}
            disabled={!workspace || load}
            model={model}
            models={prv.rows}
            onAgent={setAgent}
            onAbort={() => {
              void onAbort()
            }}
            onModel={setModel}
            onSubmit={(value) => {
              void onSubmit(value)
            }}
            onValueChange={draft.setValue}
            onVariant={setVariant}
            submitting={submitting || creating || loading}
            value={draft.value}
            variant={composer.variant}
            vars={composer.vars}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full w-full min-w-0">
      <div ref={root} className="relative flex h-full min-w-0 w-full flex-col">
        <div className="absolute right-4 top-2 z-20">
          <ChatWorkspaceToggle
            open={show}
            disabled={!workspace}
            name={workspace?.name}
            onClick={() => setOpen((prev) => !prev)}
          />
        </div>

        {!workspace ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">选择一个工作区</div>
              <p className="text-sm text-muted-foreground">活动会话会绑定到当前选中的工作区。</p>
            </div>
          </div>
        ) : split ? (
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="strategy-front:chat-workspace-width:v2"
            collapsed={!show}
            className="min-h-0 min-w-0 flex-1"
          >
            <ResizablePanel defaultSize={25} minSize={320} className="min-h-0 min-w-0">
              {chat}
            </ResizablePanel>
            <ResizableHandle withHandle className="pointer" />
            <ResizablePanel defaultSize={75} minSize={520} className="min-h-0 min-w-0">
              <ChatWorkspacePanel workspace={workspace} onClose={() => setOpen(false)} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1">{chat}</div>
        )}

        {overlay && workspace ? (
          <Sheet open={show} onOpenChange={setOpen}>
            <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-none">
              <SheetHeader className="sr-only">
                <SheetTitle>工作区</SheetTitle>
              </SheetHeader>
              <ChatWorkspacePanel workspace={workspace} onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </div>
  )
}


