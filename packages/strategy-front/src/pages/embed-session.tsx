import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Cog, PanelRightClose, PanelRightOpen, Plus, RefreshCw } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { ComposerSettingsDialog } from "@/components/chat/composer-settings-dialog"
import { StrategyChatPanel } from "@/components/strategy/strategy-chat-panel"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailPane, type WorkspaceDetailTab } from "@/components/workspace/workspace-detail-pane"
import { useEmbedComposer } from "@/hooks/use-embed-composer"
import { useEmbedEntry } from "@/hooks/use-embed-entry"
import { useStrategySession } from "@/hooks/use-strategy-session"
import { log } from "@/lib/error"

const ctrl =
  "rounded-md border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

function Status(props: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <div className="text-lg font-semibold text-foreground">{props.title}</div>
        <div className="max-w-xl text-sm leading-6 text-muted-foreground">{props.desc}</div>
      </div>
      {props.action}
    </div>
  )
}

export default function EmbedSessionPage() {
  const [query] = useSearchParams()
  const path = query.get("path")?.trim() ?? ""
  const entry = useEmbedEntry(path)
  const workspace = entry.workspace
  const composer = useEmbedComposer(workspace?.path, workspace?.type ?? "smartx")
  const chat = useStrategySession(workspace?.path)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceDetailTab>("files")
  const [spin, setSpin] = useState(false)
  const [settings, setSettings] = useState(false)

  useEffect(() => {
    if (!workspace?.path) return
    if (chat.sessionLoading || chat.creating) return
    if (chat.sessions.length > 0) return
    void chat.createSession().catch((err) => {
      log("自动创建会话失败", err)
      toast.error("自动创建会话失败")
    })
  }, [chat, workspace?.path])

  const onAbort = useCallback(async () => {
    try {
      await chat.abortSession()
    } catch (err) {
      log("停止嵌入会话失败", err)
      toast.error("停止会话失败")
    }
  }, [chat])

  const onCreate = useCallback(async () => {
    try {
      await chat.createSession()
    } catch (err) {
      log("创建嵌入会话失败", err)
      toast.error("创建会话失败")
    }
  }, [chat])

  const onRefresh = useCallback(async () => {
    setSpin(true)
    try {
      await entry.refresh()
      await chat.reloadSessions?.()
      if (chat.selectedSessionId) {
        await chat.refresh(chat.selectedSessionId)
      }
    } catch (err) {
      log("刷新嵌入页失败", err)
      toast.error("刷新失败")
    } finally {
      setSpin(false)
    }
  }, [chat, entry])

  if (!path) {
    return <Status title="缺少路径参数" desc="请使用 /embed/session?path=<工作区目录> 打开当前页面。" />
  }

  if (entry.load && !workspace) {
    return <Status title="正在准备工作区" desc="正在检查目录、Git 状态和会话运行环境。" />
  }

  if (entry.err || !workspace) {
    return (
      <Status
        title="工作区准备失败"
        desc={entry.err || "目标工作区加载失败。"}
        action={
          <Button variant="outline" onClick={() => void entry.refresh()} disabled={entry.load}>
            <RefreshCw className={`size-4 ${entry.load ? "animate-spin" : ""}`} />
            重试
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background/96 px-5 py-3 backdrop-blur dark:border-white/8 dark:bg-[#101313]/92">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1"></div>

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
              创建会话
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={ctrl}
              onClick={() => {
                setFile(null)
                setTab("files")
                setOpen((value) => !value)
              }}
            >
              {open ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              {open ? "隐藏代码区" : "显示代码区"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={ctrl}
              onClick={() => setSettings(true)}
              disabled={composer.load}
            >
              <Cog className="size-4" />
              设置
            </Button>
            <Button variant="outline" size="sm" className={ctrl} onClick={() => void onRefresh()} disabled={spin}>
              <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
              {spin ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4 pt-3">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="strategy-front:embed-session-split:v1"
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
              showAgent={false}
              showModel={false}
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

        {(chat.sessionLoading || chat.detailLoading || composer.load || entry.load) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm dark:bg-background/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <ComposerSettingsDialog
        open={settings}
        onOpenChange={setSettings}
        agent={composer.agent}
        model={composer.model}
        models={composer.models}
        variant={composer.variant}
        variants={composer.variants}
        onModel={composer.setModel}
        onVariant={composer.setVariant}
      />
    </div>
  )
}
