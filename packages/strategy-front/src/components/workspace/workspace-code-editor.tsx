import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { Editor, loader } from "@monaco-editor/react"
import "monaco-editor/esm/vs/basic-languages/html/html.contribution"
import "monaco-editor/esm/vs/basic-languages/python/python.contribution"
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution"
import { Skeleton } from "@/components/ui/skeleton"
import type { WorkspaceFileContentResponse } from "@/types/workspace"

loader.config({ monaco })

interface Props {
  loading: boolean
  error: string | null
  activeFilePath: string | null
  file: WorkspaceFileContentResponse | null
}

const language = (path: string | null) => {
  if (!path) {
    return "plaintext"
  }

  const file = path.toLowerCase().split("/").pop() ?? ""
  if (file === "dockerfile") {
    return "dockerfile"
  }

  switch (file.split(".").pop()?.toLowerCase()) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "json":
      return "json"
    case "py":
    case "pyw":
    case "pyi":
      return "python"
    case "vue":
      return "html"
    case "md":
      return "markdown"
    case "yml":
    case "yaml":
      return "yaml"
    case "css":
      return "css"
    case "html":
      return "html"
    case "xml":
      return "xml"
    case "sql":
      return "sql"
    case "sh":
    case "bash":
    case "zsh":
    case "ps1":
      return "shell"
    default:
      return "plaintext"
  }
}

const note = (file: WorkspaceFileContentResponse | null) => {
  if (!file || file.previewable) {
    return null
  }
  if (file.binary) {
    return "Binary files are not previewable."
  }
  if (file.reason === "too_large") {
    return "This file is too large to preview."
  }
  return "This file cannot be previewed."
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
    return <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">{text}</div>
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
        language={language(props.activeFilePath)}
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
