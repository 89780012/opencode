import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, FolderCode, Plus, RefreshCw, Square } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { chatApi } from "@/api/modules"
import { StrategyChatPanel } from "@/components/strategy/strategy-chat-panel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailDialog } from "@/components/workspace/workspace-detail-dialog"
import { useAgentList, useProviderList, useWorkspaceList } from "@/data/global-data-provider"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"
import { decodeStrategyPath } from "@/lib/strategy-path"

const ctrl =
  "rounded-xl border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

export default function StrategyDetailPage() {
  const params = useParams()
  const path = params.strategyID ? decodeStrategyPath(params.strategyID) : ""
  const ags = useAgentList()
  const catalog = useProviderList()
  const project = useProjectComposer()
  const { loading, refresh, select, workspaces } = useWorkspaceList()
  const workspace = useMemo(() => workspaces.find((item) => item.path === path) ?? null, [path, workspaces])
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const { selectedSessionId, creating, createSession, selectSession, sessions, ensureSessions } = useChatSessions(path)
  const { status } = useChatSessionDetail(path, selectedSessionId)
  const busy = !!selectedSessionId && status.type !== "idle"

  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined
  const current = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )

  useEffect(() => {
    if (!workspace) return
    select(workspace)
  }, [select, workspace])

  useEffect(() => {
    void ensureSessions()
  }, [ensureSessions])

  useEffect(() => {
    if (selectedSessionId || sessions.length === 0) return
    selectSession(sessions[0].id)
  }, [selectSession, selectedSessionId, sessions])

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

  const onAbort = useCallback(async () => {
    if (!selectedSessionId || !busy) return
    try {
      await chatApi.abortSession(path, selectedSessionId)
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止失败")
    }
  }, [busy, path, selectedSessionId])

  const onCreate = useCallback(async () => {
    try {
      await createSession()
    } catch (err) {
      console.error("Failed to create session", err)
      toast.error("新建会话失败")
    }
  }, [createSession])

  if (loading && !workspace) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载策略...</div>
  }

  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">策略加载失败</div>
        <div className="text-sm text-muted-foreground">未找到对应的策略工作区。</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/strategies">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sticky flex h-full min-h-0 flex-col bg-background dark:bg-[#0f1111]">
        <div className="px-6 pb-1 pt-1 dark:bg-card ">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className={ctrl} asChild>
                <Link to="/app/strategies">
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSessionId ?? ""} onValueChange={selectSession} disabled={sessions.length === 0}>
                <SelectTrigger className={`h-8 w-[190px] ${ctrl}`}>
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
              <Button variant="outline" size="sm" className={ctrl} onClick={() => void onCreate()} disabled={creating}>
                <Plus className="size-4" />
                新建会话
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={ctrl}
                onClick={() => {
                  setFile(null)
                  setOpen(true)
                }}
              >
                <FolderCode className="size-4" />
                查看代码
              </Button>
              <Button variant="outline" size="sm" className={ctrl} onClick={() => void refresh()}>
                <RefreshCw className="size-4" />
                刷新
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 pb-4">
          <StrategyChatPanel
            workspace={workspace}
            agents={ags.names}
            models={catalog.visibleModels}
            agent={composer.agent?.name}
            model={model}
            variant={composer.variant}
            variants={composer.variants}
            load={ags.load || catalog.load}
            onAgent={setAgent}
            onModel={setModel}
            onVariant={setVariant}
            onAbort={() => {
              void onAbort()
            }}
            onOpenDiff={(value) => {
              setFile(value)
              setOpen(true)
            }}
          />
        </div>
      </div>

      <WorkspaceDetailDialog
        open={open}
        workspace={workspace}
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
