import { FolderOpen, MessageSquareText } from "lucide-react"
import { useState } from "react"
import { SessionSidebarPanel } from "@/components/chat/session-sidebar-panel"
import { SidebarHeader } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LocalWorkspaceTab } from "@/components/workspace/local-workspace-tab"
import { useWorkspaceList } from "@/data/global-data"

type Tab = "workspace" | "session"

interface Props {
  start?: Tab
}

export function HomeSidebarPanel(props: Props) {
  const { selected: workspace } = useWorkspaceList()
  const [tab, setTab] = useState<Tab>(props.start ?? (workspace ? "session" : "workspace"))

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="flex h-full min-h-0 flex-col gap-0">
      <SidebarHeader className="gap-3 border-b p-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">对话工作台</div>
          <p className="text-xs leading-5 text-muted-foreground">先选择工作区，再查看或创建该工作区下的会话。</p>
        </div>
        <TabsList className="grid h-9 w-full grid-cols-2">
          <TabsTrigger value="workspace" className="gap-2">
            <FolderOpen className="size-4" />
            工作区
          </TabsTrigger>
          <TabsTrigger value="session" className="gap-2">
            <MessageSquareText className="size-4" />
            会话
          </TabsTrigger>
        </TabsList>
      </SidebarHeader>

      <TabsContent value="workspace" className="mt-0 flex min-h-0 flex-1 flex-col">
        <LocalWorkspaceTab onPick={() => setTab("session")} />
      </TabsContent>
      <TabsContent value="session" className="mt-0 flex min-h-0 flex-1 flex-col">
        <SessionSidebarPanel onWorkspace={() => setTab("workspace")} />
      </TabsContent>
    </Tabs>
  )
}
