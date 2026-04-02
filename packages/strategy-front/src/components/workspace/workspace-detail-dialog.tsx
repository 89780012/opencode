import { useEffect, useState } from "react"
import { SessionReviewPanel } from "@/components/review/session-review-panel"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane"
import { useChatReview } from "@/hooks/use-chat-review"
import type { LocalWorkspace } from "@/types/workspace"

type Tab = "review" | "files"

interface Props {
  open: boolean
  workspace: LocalWorkspace | null
  sessionId?: string | null
  file?: string | null
  onOpenChange: (open: boolean) => void
}

export function WorkspaceDetailDialog(props: Props) {
  const [tab, setTab] = useState<Tab>(props.file ? "review" : "files")
  const view = tab
  const review = useChatReview(props.workspace?.path, props.sessionId, props.open && view === "review")

  useEffect(() => {
    if (!props.open) return
    if (!props.file) return
    setTab("review")
    review.open(props.file)
  }, [props.file, props.open, review.open])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="top-4 right-4 bottom-4 left-4 flex h-auto w-auto max-w-none min-w-0 translate-x-0 translate-y-0 flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{props.workspace?.name ?? "工作区详情"}</DialogTitle>
        </DialogHeader>
        {props.workspace ? (
          <Tabs
            value={view}
            onValueChange={(value) => setTab(value as Tab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="border-b px-4 py-2">
              <TabsList className="justify-start">
                <TabsTrigger value="review">代码变更</TabsTrigger>
                <TabsTrigger value="files">文件</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="review" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              <SessionReviewPanel
                sessionId={props.sessionId}
                diffs={review.diffs}
                diff={review.diff}
                file={review.file}
                mode={review.mode}
                loading={review.loading}
                err={review.err}
                onFile={review.open}
                onMode={review.setMode}
                onRefresh={review.refresh}
              />
            </TabsContent>
            <TabsContent value="files" className="min-h-0 flex-1 data-[state=inactive]:hidden">
              <WorkspaceEditorPane workspace={props.workspace} readonly />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
