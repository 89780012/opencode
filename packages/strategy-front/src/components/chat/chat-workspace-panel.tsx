import { SessionReviewPanel } from "@/components/review/session-review-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane"
import type { ReviewMode } from "@/hooks/use-chat-review"
import type { ProjectInfo } from "@/types/project"
import type { ChatFileDiff } from "@/types/chat"
import type { LocalWorkspace } from "@/types/workspace"

export type WorkspaceTab = "review" | "files"

interface Props {
  workspace: LocalWorkspace
  sessionId?: string | null
  tab: WorkspaceTab
  review: {
    diffs: ChatFileDiff[]
    diff: ChatFileDiff | null
    file: string | null
    mode: ReviewMode
    loading: boolean
    err: string | null
    open: (path: string) => void
    refresh: () => void
    setMode: (mode: ReviewMode) => void
  }
  project: {
    data: ProjectInfo | null
    loading: boolean
    err: string | null
    initing: boolean
    init: () => Promise<unknown>
  }
  onTab: (tab: WorkspaceTab) => void
  onClose?: () => void
}

export function ChatWorkspacePanel(props: Props) {
  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-col bg-background">
      <Tabs
        value={props.tab}
        onValueChange={(value) => props.onTab(value as WorkspaceTab)}
        className="min-h-0 flex-1 gap-0 pt-2"
      >
        <TabsList className="justify-start">
          <TabsTrigger value="review" disabled={!props.sessionId}>
            审查
          </TabsTrigger>
          <TabsTrigger value="files">项目文件</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="min-h-0 flex-1 data-[state=inactive]:hidden">
          <SessionReviewPanel
            sessionId={props.sessionId}
            diffs={props.review.diffs}
            diff={props.review.diff}
            file={props.review.file}
            mode={props.review.mode}
            loading={props.review.loading}
            err={props.review.err}
            onFile={props.review.open}
            onMode={props.review.setMode}
            onRefresh={props.review.refresh}
          />
        </TabsContent>
        <TabsContent value="files" className="min-h-0 flex-1 data-[state=inactive]:hidden">
          <WorkspaceEditorPane workspace={props.workspace} readonly />
        </TabsContent>
      </Tabs>
    </section>
  )
}
