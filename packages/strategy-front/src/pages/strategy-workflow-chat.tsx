import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { StrategyWorkflowPanel } from "@/components/strategy/strategy-workflow-panel"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { WorkspaceDetailPane, type WorkspaceDetailTab } from "@/components/workspace/workspace-detail-pane"
import { useWorkspaceList } from "@/data/global-data-provider"
import { useStrategyComposer } from "@/hooks/use-strategy-composer"
import { useStrategyWorkflowChat } from "@/hooks/use-strategy-workflow-chat"
import { decodeStrategyPath } from "@/lib/strategy-path"

const ctrl =
  "rounded-md border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

function phaseText(value: string) {
  if (value === "running") return "执行中"
  if (value === "blocked") return "已阻塞"
  if (value === "done") return "已完成"
  if (value === "failed") return "已失败"
  if (value === "interrupted") return "已中断"
  return "空闲"
}

export default function StrategyWorkflowChatPage() {
  const params = useParams()
  const path = params.strategyID ? decodeStrategyPath(params.strategyID) : ""
  const { loading, refresh, select, workspaces } = useWorkspaceList()
  const workspace = useMemo(() => workspaces.find((item) => item.path === path) ?? null, [path, workspaces])
  const kind = workspace?.type ?? "other"
  const composer = useStrategyComposer(kind, kind)
  const chat = useStrategyWorkflowChat(path)
  const agent = composer.agents.includes("plan") ? "plan" : (composer.agent ?? composer.agents[0])
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceDetailTab>("files")
  const [spin, setSpin] = useState(false)

  useEffect(() => {
    if (!workspace) return
    select(workspace)
  }, [select, workspace])

  useEffect(() => {
    if (!chat.state?.workflow_id) return
    if (chat.model || !composer.model) return
    chat.setModel(composer.model)
  }, [chat.model, chat.setModel, chat.state?.workflow_id, composer.model])

  const reload = useCallback(async () => {
    setSpin(true)
    try {
      await Promise.all([refresh(), chat.refresh()])
    } catch (err) {
      console.error("Failed to refresh workflow chat page", err)
      toast.error("刷新页面失败。")
    } finally {
      setSpin(false)
    }
  }, [chat, refresh])

  if (loading && !workspace) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载策略...</div>
  }

  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">未找到策略</div>
        <div className="text-sm text-muted-foreground">无法加载请求的工作区。</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/strategies">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void reload()} disabled={spin}>
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
          <Button variant="outline" onClick={() => void reload()} disabled={spin}>
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
            <div className="rounded-full border border-black/8 bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              工作流对话
            </div>
            <div className="rounded-full border border-black/8 bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              {phaseText(chat.phase)}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" className={ctrl} onClick={() => void reload()} disabled={spin}>
              <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
              {spin ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="strategy-front:strategy-workflow-chat-split:v2"
          collapsed={!open}
          className="h-full min-h-0 rounded-[24px] border border-black/6 bg-background/80 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#0f1111]"
        >
          <ResizablePanel defaultSize={62} minSize={420} className="min-h-0 min-w-0">
            <StrategyWorkflowPanel
              workspace={workspace}
              chat={chat}
              agent={agent}
              models={composer.models}
              model={chat.model}
              variant={chat.variant}
              variants={composer.variants}
              load={composer.load}
              onModel={chat.setModel}
              onVariant={chat.setVariant}
              onOpenDiff={(value) => {
                setFile(value)
                setTab("review")
                setOpen(true)
              }}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="pointer" />
          <ResizablePanel defaultSize={38} minSize={360} className="min-h-0 min-w-0 border-l border-black/6 dark:border-white/8">
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

        {(chat.sessionLoading || chat.detailLoading || chat.load) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm dark:bg-background/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
