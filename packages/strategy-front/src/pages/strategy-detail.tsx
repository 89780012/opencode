import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, PanelRightClose, PanelRightOpen, Plus, RefreshCw } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { StrategyChatPanel } from "@/components/strategy/strategy-chat-panel"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailPane, type WorkspaceDetailTab } from "@/components/workspace/workspace-detail-pane"
import { useWorkspaceList } from "@/data/global-data-provider"
import { useStrategyComposer } from "@/hooks/use-strategy-composer"
import { useStrategySession } from "@/hooks/use-strategy-session"
import { decodeStrategyPath } from "@/lib/strategy-path"

const ctrl =
  "rounded-md border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

export default function StrategyDetailPage() {
  const params = useParams()
  const path = params.strategyID ? decodeStrategyPath(params.strategyID) : ""
  const { loading, refresh, select, workspaces } = useWorkspaceList()
  const workspace = useMemo(() => workspaces.find((item) => item.path === path) ?? null, [path, workspaces])
  const kind = workspace?.type ?? "other"
  const composer = useStrategyComposer(path, kind)
  const chat = useStrategySession(path)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceDetailTab>("files")
  const [spin, setSpin] = useState(false)

  useEffect(() => {
    if (!workspace) {
      return
    }
    select(workspace)
  }, [select, workspace])

  const onAbort = useCallback(async () => {
    try {
      await chat.abortSession()
    } catch (err) {
      console.error("Failed to abort prompt", err)
      toast.error("停止会话失败")
    }
  }, [chat])

  const onCreate = useCallback(async () => {
    try {
      await chat.createSession()
    } catch (err) {
      console.error("Failed to create session", err)
      toast.error("创建会话失败")
    }
  }, [chat])

  const onRefresh = useCallback(async () => {
    setSpin(true)
    try {
      await refresh()
    } catch (err) {
      console.error("Failed to refresh", err)
      toast.error("刷新失败")
    } finally {
      setSpin(false)
    }
  }, [refresh])

  if (loading && !workspace) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载策略...</div>
  }

  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">策略加载失败</div>
        <div className="text-sm text-muted-foreground">未找到请求的策略工作区。</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/strategies">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={spin}>
            <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
            {spin ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>
    )
  }

  if (workspace.missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">工作区目录不存在</div>
        <div className="text-sm text-muted-foreground">该策略仍已登记，但本地目录已经不存在。</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/strategies">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={spin}>
            <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
            {spin ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky flex h-full min-h-0 flex-col bg-background dark:bg-[#0f1111]">
      <div className="px-6 pb-1 pt-1 dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className={`${ctrl} h-8 w-8 overflow-hidden rounded-full`} asChild>
              <Link to="/app/strategies">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={chat.selectedSessionId ?? ""}
              onValueChange={chat.selectSession}
              disabled={chat.sessions.length === 0}
            >
              <SelectTrigger className={`h-8 w-[190px] ${ctrl}`}>
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
              className={ctrl}
              onClick={() => void onCreate()}
              disabled={chat.creating}
            >
              <Plus className="size-4" />
              新建会话
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={ctrl}
              onClick={() => {
                setFile(null)
                setTab("files")
                setOpen((prev) => !prev)
              }}
            >
              {open ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              {open ? "收起代码" : "查看代码"}
            </Button>
            <Button variant="outline" size="sm" className={ctrl} onClick={onRefresh} disabled={spin}>
              <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
              {spin ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="strategy-front:strategy-detail-split:v1"
          collapsed={!open}
          className="h-full min-h-0 rounded-[24px] border border-black/6 bg-background/80 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#0f1111]"
        >
          <ResizablePanel defaultSize={62} minSize={420} className="min-h-0 min-w-0">
            <StrategyChatPanel
              workspace={workspace}
              selectedSessionId={chat.selectedSessionId}
              sessionLoading={chat.sessionLoading}
              detailLoading={chat.detailLoading}
              messages={chat.messages}
              status={chat.status}
              busy={chat.busy}
              eventErr={chat.eventErr}
              agents={composer.agents}
              models={composer.models}
              agent={composer.agent}
              model={composer.model}
              variant={composer.variant}
              variants={composer.variants}
              creating={chat.creating}
              load={composer.load}
              onCreate={chat.createSession}
              onSelectSession={chat.selectSession}
              onAgent={composer.setAgent}
              onModel={composer.setModel}
              onVariant={composer.setVariant}
              onAbort={() => {
                void onAbort()
              }}
              onOpenDiff={(value) => {
                setFile(value)
                setTab("review")
                setOpen(true)
              }}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="pointer" />
          <ResizablePanel
            defaultSize={38}
            minSize={360}
            className="min-h-0 min-w-0 border-l border-black/6 dark:border-white/8"
          >
            <WorkspaceDetailPane
              open={open}
              tab={tab}
              workspace={workspace}
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
          </ResizablePanel>
        </ResizablePanelGroup>

        {(chat.sessionLoading || chat.detailLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm dark:bg-background/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
