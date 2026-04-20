import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Cog, PanelRightClose, PanelRightOpen, Plus, RefreshCw } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { EmbedProviderSettingsDialog } from "@/components/chat/embed-provider-settings-dialog"
import { StrategyChatPanel } from "@/components/strategy/strategy-chat-panel"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspaceDetailPane, type WorkspaceDetailTab } from "@/components/workspace/workspace-detail-pane"
import { useComposer } from "@/hooks/use-composer"
import { useEmbedEntry } from "@/hooks/use-embed-entry"
import { useStrategySession } from "@/hooks/use-strategy-session"
import { log } from "@/lib/error"

const ctrl =
  "rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-[#2a312f] dark:bg-[#151918] dark:text-[#e4ece8] dark:hover:border-[#35403c] dark:hover:bg-[#1a1f1e]"

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
  const composer = useComposer()
  const agent = "smartx-helper"
  const chat = useStrategySession(workspace?.path)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceDetailTab>("files")
  const [spin, setSpin] = useState(false)
  const [settings, setSettings] = useState(false)
  const init = useRef<string | null>(null)

  useEffect(() => {
    if (init.current === workspace?.path) {
      return
    }
    init.current = null
  }, [workspace?.path])

  useEffect(() => {
    if (!workspace?.path) return
    if (!chat.loaded) return
    if (chat.sessionLoading || chat.creating) return
    if (init.current === workspace.path) return

    init.current = workspace.path

    if (chat.sessions.length > 0) {
      const item = chat.sessions[0]
      if (item && chat.selectedSessionId !== item.id) {
        chat.selectSession(item.id)
      }
      return
    }

    void chat.createSession().catch((err) => {
      init.current = null
      log("自动创建会话失败", err)
      toast.error("自动创建会话失败")
    })
  }, [
    chat.creating,
    chat.createSession,
    chat.loaded,
    chat.selectedSessionId,
    chat.selectSession,
    chat.sessionLoading,
    chat.sessions,
    workspace?.path,
  ])

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
      init.current = null
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

  const wait =
    entry.phase === "init"
      ? {
          title: "正在初始化 Git 仓库",
          desc: "检测到当前目录还不是 Git 仓库，正在自动执行初始化。",
        }
      : {
          title: "正在准备工作区",
          desc: "正在检查目录、Git 状态和会话运行环境。",
        }

  if (!path) {
    return <Status title="缺少路径参数" desc="请使用 /embed/session?path=<工作区目录> 打开当前页面。" />
  }

  if (entry.load && !workspace) {
    return <Status title={wait.title} desc={wait.desc} />
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
    <div className="embed-session-shell flex h-full min-h-0 flex-col bg-[#f5f7fb] dark:bg-[#0f1111]">
      <div className="embed-session-toolbar border border-slate-200 bg-white px-4 py-1 shadow-[0_14px_40px_rgba(15,23,42,0.06)] dark:border-[#222826] dark:bg-[#101313] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1" />

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

      <div className="relative min-h-0 flex-1">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="strategy-front:embed-session-split:v1"
          collapsed={!open}
          className="embed-session-frame h-full min-h-0 overflow-hidden border border-slate-200 bg-white shadow-[0_22px_56px_rgba(15,23,42,0.08)] dark:border-[#222826] dark:bg-[#0f1111] dark:shadow-none"
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
              agent={agent}
              model={composer.model}
              variant={composer.variant}
              variants={composer.variants}
              creating={chat.creating}
              load={composer.load}
              showAgent={false}
              showModel={true}
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
            className="min-h-0 min-w-0 border-l border-slate-200 dark:border-[#222826]"
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
          <div className="embed-session-mask absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-[#0f1111]/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <EmbedProviderSettingsDialog
        open={settings}
        onOpenChange={setSettings}
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
