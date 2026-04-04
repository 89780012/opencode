import { Columns2, Rows2 } from "lucide-react"
import { ReviewDiffViewer } from "@/components/review/review-diff-viewer"
import { ReviewFileList } from "@/components/review/review-file-list"
import { Button } from "@/components/ui/button"
import type { ReviewMode } from "@/hooks/use-chat-review"
import type { ChatFileDiff } from "@/types/chat"

interface Props {
  sessionId?: string | null
  diffs: ChatFileDiff[]
  diff: ChatFileDiff | null
  file: string | null
  mode: ReviewMode
  loading?: boolean
  err?: string | null
  onFile: (path: string) => void
  onMode: (mode: ReviewMode) => void
  onRefresh: () => void
}

export function SessionReviewPanel(props: Props) {
  if (!props.sessionId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center px-6 text-sm text-muted-foreground">
        选择一个会话后，这里会显示对应的代码变更。
      </div>
    )
  }

  if (props.loading && props.diffs.length === 0) {
    return <ReviewDiffViewer diff={null} mode={props.mode} loading />
  }

  if (!props.loading && props.diffs.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">暂无代码变更</div>
        <div className="max-w-sm text-sm text-muted-foreground">当这次会话产生文件修改时，这里会按文件列出改动并支持直接查看 diff。</div>
        {props.err ? <div className="text-sm text-destructive">{props.err}</div> : null}
        <Button variant="outline" onClick={props.onRefresh} disabled={props.loading}>
          {props.loading ? "刷新中..." : "刷新变更"}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {props.err ? <div className="border-b bg-red-50 px-3 py-2 text-xs text-red-700">{props.err}</div> : null}
        <ReviewDiffViewer diff={props.diff} mode={props.mode} loading={props.loading} />
      </div>
      <ReviewFileList
        diffs={props.diffs}
        file={props.file}
        loading={props.loading}
        onFile={props.onFile}
        onRefresh={props.onRefresh}
        side={
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              size="icon-xs"
              variant={props.mode === "split" ? "secondary" : "ghost"}
              onClick={() => props.onMode("split")}
              aria-label="Split diff"
            >
              <Columns2 className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant={props.mode === "unified" ? "secondary" : "ghost"}
              onClick={() => props.onMode("unified")}
              aria-label="Unified diff"
            >
              <Rows2 className="size-3.5" />
            </Button>
          </div>
        }
      />
    </div>
  )
}
