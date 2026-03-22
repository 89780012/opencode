import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { loader } from "@monaco-editor/react"
import "monaco-editor/esm/vs/basic-languages/html/html.contribution"
import "monaco-editor/esm/vs/basic-languages/python/python.contribution"
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution"

loader.config({ monaco })

export function editorLanguage(path: string | null) {
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
