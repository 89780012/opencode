import { DiffEditor } from "@monaco-editor/react"
import { Skeleton } from "@/components/ui/skeleton"
import { editorLanguage } from "@/lib/editor-language"
import type { ReviewMode } from "@/hooks/use-chat-review"
import type { ChatFileDiff } from "@/types/chat"

interface Props {
  diff: ChatFileDiff | null
  mode: ReviewMode
  loading?: boolean
}

export function ReviewDiffViewer(props: Props) {
  if (props.loading && !props.diff) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (!props.diff) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
        Select a file to inspect the diff
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="border-b bg-muted/10 px-3 py-2">
        <div className="truncate text-sm font-medium" title={props.diff.file}>
          {props.diff.file}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <DiffEditor
          height="100%"
          width="100%"
          original={props.diff.before}
          modified={props.diff.after}
          language={editorLanguage(props.diff.file)}
          originalModelPath={`original:${props.diff.file}`}
          modifiedModelPath={`modified:${props.diff.file}`}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: true,
            renderSideBySide: props.mode === "split",
            scrollBeyondLastLine: false,
            wordWrap: "off",
          }}
        />
      </div>
    </div>
  )
}
