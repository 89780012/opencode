import { Editor } from "@monaco-editor/react"
import { Skeleton } from "@/components/ui/skeleton"
import { editorLanguage } from "@/lib/editor-language"
import type { WorkspaceFileContentResponse } from "@/types/workspace"

interface Props {
  loading: boolean
  error: string | null
  activeFilePath: string | null
  file: WorkspaceFileContentResponse | null
}

const note = (file: WorkspaceFileContentResponse | null) => {
  if (!file || file.previewable) {
    return null
  }
  if (file.binary) {
    return "二进制文件不能预览."
  }
  if (file.reason === "too_large") {
    return "预览文件太大."
  }
  return "这个文件不能预览."
}

export function WorkspaceCodeEditor(props: Props) {
  if (props.loading) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (props.error) {
    return <div className="flex h-full items-center justify-center px-6 text-sm text-destructive">{props.error}</div>
  }

  if (!props.activeFilePath) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
        在这个工作区内没有有效文件可以预览。
      </div>
    )
  }

  const text = note(props.file)
  if (text) {
    return (
      <div className="flex flex-1 h-full items-center justify-center px-6 text-sm text-muted-foreground">{text}</div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {props.file?.truncated ? (
        <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This preview was truncated because the file is large.
        </div>
      ) : null}
      <Editor
        height="100%"
        width="100%"
        path={props.activeFilePath}
        value={props.file?.content ?? ""}
        language={editorLanguage(props.activeFilePath)}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          readOnly: true,
          wordWrap: "off",
          scrollBeyondLastColumn: 5,
        }}
      />
    </div>
  )
}
