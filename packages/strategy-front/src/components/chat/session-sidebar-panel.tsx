import { FolderOpen, MessageSquareText, Plus, RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { useWorkspaceList } from "@/components/data/global-data-provider"
import { Button } from "@/components/ui/button"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatSessions } from "@/hooks/use-chat-sessions"

interface Props {
  onWorkspace?: () => void
}

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export function SessionSidebarPanel(props: Props) {
  const { selected: workspace } = useWorkspaceList()
  const path = workspace?.path ?? null
  const { sessions, selectedSessionId, loading, refreshSessions, selectSession } = useChatSessions(path)

  useEffect(() => {
    if (!path) {
      return
    }
    void refreshSessions()
  }, [path, refreshSessions])

  return (
    <>
      <SidebarHeader className="gap-2 border-b p-3">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => selectSession(null)} disabled={!path}>
            <Plus className="size-4" />
            新建会话
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refreshSessions()
            }}
            disabled={!path || loading}
          >
            <RefreshCw className="size-4" />
            {loading ? "刷新中..." : "刷新会话"}
          </Button>
        </div>
        <div className="px-1 text-xs text-muted-foreground">
          {workspace ? `当前工作区: ${workspace.name}` : "请先选择工作区"}
        </div>
      </SidebarHeader>

      {!workspace ? (
        <SidebarContent className="overflow-hidden">
          <SidebarGroup className="h-full">
            <SidebarGroupContent className="flex h-full items-center justify-center px-4">
              <div className="max-w-xs space-y-3 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <FolderOpen className="size-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-semibold">请先选择工作区</div>
                <p className="text-xs leading-5 text-muted-foreground">
                  会话列表会按工作区隔离展示。先在工作区标签中选择一个工作区，再回到这里查看对应会话。
                </p>
                <Button variant="outline" size="sm" onClick={() => props.onWorkspace?.()}>
                  前往工作区
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      ) : (
        <SidebarContent className="overflow-hidden">
          <SidebarGroup className="h-full px-0">
            <SidebarGroupLabel className="px-3">会话</SidebarGroupLabel>
            <SidebarGroupContent className="h-full overflow-hidden px-2 pb-2">
              {loading && sessions.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  正在加载会话...
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                    <MessageSquareText className="size-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">还没有会话</div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      点击“新建会话”，或直接在主区域发送第一条消息来创建当前工作区的会话。
                    </p>
                  </div>
                </div>
              ) : (
                <SidebarMenu className="custom-scrollbar h-full gap-2 overflow-x-hidden overflow-y-auto pr-1">
                  {sessions.map((item) => {
                    const text = item.title || "未命名会话"

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          type="button"
                          isActive={selectedSessionId === item.id}
                          className="h-auto items-start gap-2 px-2 py-2"
                          onClick={() => selectSession(item.id)}
                        >
                          <MessageSquareText className="mt-0.5 size-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-sm font-medium whitespace-normal break-words">
                                  {text}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" sideOffset={8}>
                                {text}
                              </TooltipContent>
                            </Tooltip>
                            <div className="truncate text-xs text-muted-foreground">
                              {fmt.format(new Date(item.time.updated))}
                            </div>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      )}
    </>
  )
}
