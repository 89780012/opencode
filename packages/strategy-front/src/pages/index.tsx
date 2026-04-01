import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CirclePlus, FolderOpen, PanelLeftClose, PanelLeftOpen, SquarePen } from "lucide-react"
import { toast } from "sonner"
import { chatApi } from "@/api/modules"
import { HomeSidebarPanel } from "@/components/home/home-sidebar-panel"
import { WorkspaceCreateDialog } from "@/components/workspace/workspace-create-dialog"
import { Button } from "@/components/ui/button"
import { ChatWorkspacePanel, type WorkspaceTab } from "@/components/chat/chat-workspace-panel"
import { ChatWorkspaceToggle } from "@/components/chat/chat-workspace-toggle"
import { useAgentList, useProviderList, useWorkspaceList } from "@/data/global-data-provider"
import { ChatMessageList } from "@/components/chat-message-list"
import { PermissionPanel } from "@/components/chat/permission-panel"
import { PromptBar } from "@/components/chat/prompt-bar"
import { QuestionPanel } from "@/components/chat/question-panel"
import { TodoPanel } from "@/components/chat/todo-panel"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatEvents } from "@/hooks/use-chat-events"
import { useChatPermission } from "@/hooks/use-chat-permission"
import { useChatQuestion } from "@/hooks/use-chat-question"
import { useChatReview } from "@/hooks/use-chat-review"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useChatTodo } from "@/hooks/use-chat-todo"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { usePromptSubmit } from "@/hooks/use-prompt-submit"
import { useSessionDraft } from "@/hooks/use-session-draft"
import { resolveComposer } from "@/lib/chat-composer"

type NavTab = "workspace" | "session"

export default function Home() {
  const { selected: workspace } = useWorkspaceList()
  const path = workspace?.path ?? null
  const [nav, setNav] = useState(false)
  const [navTab, setNavTab] = useState<NavTab>(workspace ? "session" : "workspace")
  const [createOpen, setCreateOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const [tab, setTab] = useState<WorkspaceTab>("files")
  const root = useRef<HTMLDivElement | null>(null)

  useChatEvents(path)

  const { selectedSessionId, loading, creating, createSession, selectSession } = useChatSessions(path)
  const ags = useAgentList()
  const catalog = useProviderList()
  const project = useProjectComposer()
  const sessionDraft = useSessionDraft(path, selectedSessionId)
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  const { messages, status, eventErr, loading: detail } = useChatSessionDetail(path, selectedSessionId)
  const review = useChatReview(path, selectedSessionId, !!workspace && open && tab === "review")
  const permission = useChatPermission(path, selectedSessionId)
  const question = useChatQuestion(path, selectedSessionId)
  const { submitting, submit } = usePromptSubmit({
    workspacePath: path,
    sessionId: selectedSessionId,
    agent: composer.agent?.name,
    model: composer.model,
    variant: composer.variant,
    createSession,
    selectSession,
    onSubmitted: sessionDraft.clear,
  })
  const busy = !!selectedSessionId && status.type !== "idle"
  const live = busy || !!permission.req || !!question.req
  const todo = useChatTodo(path, selectedSessionId, live)
  const empty = !selectedSessionId || (!detail && status.type !== "busy" && messages.length === 0)
  const load = ags.load || catalog.load
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
      if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) return
      project.setModel({ providerID, modelID })
    },
    [catalog.connectedModels, project],
  )

  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  const openDiff = useCallback(
    (file: string) => {
      if (!workspace || !selectedSessionId) return

      setOpen(true)
      setTab("review")
      review.open(file)
    },
    [review, selectedSessionId, workspace],
  )

  useEffect(() => {
    const node = root.current
    if (!node) return

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
    if (!path || !selectedSessionId || !busy) return

    try {
      await chatApi.abortSession(path, selectedSessionId)
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止失败")
    }
  }

  const openNav = (tab: NavTab) => {
    setNavTab(tab)
    setNav(true)
  }

  const onCreateWorkspace = () => setCreateOpen(true)

  const show = !!workspace && open
  const overlay = show && !wide
  const chat = (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <ChatMessageList
          key={selectedSessionId}
          err={eventErr}
          messages={messages}
          loading={detail && !!selectedSessionId}
          status={status}
          onOpenDiff={openDiff}
        />

        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="max-w-md space-y-4 text-center">
              <div className="text-xl font-semibold">开始新会话</div>
              <p className="text-sm text-muted-foreground">
                先打开左侧工作台选择工作区和会话，或者直接发送第一条消息创建当前工作区的新会话。
              </p>
              {!workspace ? (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => openNav("workspace")}>
                    <PanelLeftOpen className="size-4" />
                    打开侧边栏
                  </Button>
                </div>
              ) : null}
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
            models={catalog.visibleModels}
            onAgent={setAgent}
            onAbort={() => {
              void onAbort()
            }}
            onModel={setModel}
            onSubmit={(value) => {
              void onSubmit(value)
            }}
            onValueChange={sessionDraft.setText}
            onVariant={setVariant}
            submitting={submitting || creating || loading}
            value={sessionDraft.text}
            variant={composer.variant}
            variants={composer.variants}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full w-full min-w-0">
      <div ref={root} className="relative flex h-full min-w-0 w-full flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div className="relative px-4 py-3">
            <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-sm backdrop-blur">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={() => setNav((prev) => !prev)}
                  >
                    {nav ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>打开侧边栏</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onCreateWorkspace}>
                    <CirclePlus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>创建新工作区</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={() => selectSession(null)}
                    disabled={!workspace}
                  >
                    <SquarePen className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>创建新会话</TooltipContent>
              </Tooltip>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-24 text-center">
              <div className="text-sm font-medium">
                {workspace ? (
                  <>
                    <span className="inline-block max-w-full truncate rounded-full bg-background/90 px-3 py-1 shadow-sm backdrop-blur">
                      {workspace.name}
                    </span>
                    <span className="mx-2 inline-block max-w-full truncate rounded-full bg-background/90 px-3 py-1 shadow-sm backdrop-blur"></span>
                  </>
                ) : (
                  <div></div>
                )}
                {/* <span className="inline-block max-w-full truncate rounded-full bg-background/90 px-3 py-1 shadow-sm backdrop-blur">
                  {workspace?.name ?? "未选择工作区"}
                </span> */}
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute right-4 top-3 z-20">
            <ChatWorkspaceToggle
              open={show}
              disabled={!workspace}
              name={workspace?.name}
              onClick={() => setOpen((prev) => !prev)}
            />
          </div>

          {!workspace ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-md space-y-4 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <FolderOpen className="size-6 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold">选择一个工作区</div>
                <p className="text-sm text-muted-foreground">活动会话会绑定到当前选中的工作区。</p>
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => openNav("workspace")}>
                    <PanelLeftOpen className="size-4" />
                    打开侧边栏
                  </Button>
                </div>
              </div>
            </div>
          ) : wide ? (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="strategy-front:chat-workspace-width:v2"
              collapsed={!show}
              className="min-h-0 min-w-0 h-full"
            >
              <ResizablePanel defaultSize={25} minSize={320} className="min-h-0 min-w-0">
                {chat}
              </ResizablePanel>
              <ResizableHandle withHandle className="pointer" />
              <ResizablePanel defaultSize={75} minSize={520} className="min-h-0 min-w-0">
                <ChatWorkspacePanel
                  workspace={workspace}
                  sessionId={selectedSessionId}
                  tab={tab}
                  review={review}
                  onTab={setTab}
                  onClose={() => setOpen(false)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex h-full min-h-0 min-w-0 flex-1">{chat}</div>
          )}
        </div>

        {overlay && workspace ? (
          <Sheet open={show} onOpenChange={setOpen}>
            <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-none">
              <SheetHeader className="sr-only">
                <SheetTitle>工作区</SheetTitle>
              </SheetHeader>
              <ChatWorkspacePanel
                workspace={workspace}
                sessionId={selectedSessionId}
                tab={tab}
                review={review}
                onTab={setTab}
                onClose={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
        ) : null}

        <Sheet open={nav} onOpenChange={setNav}>
          <SheetContent side="left" className="w-[92vw] p-0 sm:max-w-[420px]">
            <SheetHeader className="sr-only">
              <SheetTitle>工作台</SheetTitle>
            </SheetHeader>
            <div className="bg-sidebar text-sidebar-foreground flex h-full min-h-0 flex-col">
              <HomeSidebarPanel key={navTab} start={navTab} />
            </div>
          </SheetContent>
        </Sheet>

        <WorkspaceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  )
}
