import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { loader } from "@monaco-editor/react"
import "monaco-editor/esm/vs/basic-languages/html/html.contribution"
import "monaco-editor/esm/vs/basic-languages/python/python.contribution"
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution"

loader.config({ monaco })

monaco.editor.defineTheme("strategy-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#fcfcfb",
    "editor.lineHighlightBackground": "#f3f4f6",
    "editorLineNumber.foreground": "#94a3b8",
    "editorLineNumber.activeForeground": "#334155",
    "editor.selectionBackground": "#dbeafe",
    "editor.inactiveSelectionBackground": "#e5e7eb",
    "editorGutter.background": "#fcfcfb",
    "scrollbarSlider.background": "#cbd5e166",
    "scrollbarSlider.hoverBackground": "#94a3b899",
    "scrollbarSlider.activeBackground": "#64748bcc",
    "diffEditor.insertedTextBackground": "#dcfce7",
    "diffEditor.removedTextBackground": "#fee2e2",
    "diffEditor.insertedLineBackground": "#f0fdf4",
    "diffEditor.removedLineBackground": "#fef2f2",
    "diffEditor.diagonalFill": "#f8fafc",
  },
})

monaco.editor.defineTheme("strategy-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#0f1412",
    "editor.foreground": "#e5f0ea",
    "editor.lineHighlightBackground": "#18201d",
    "editorLineNumber.foreground": "#5f736a",
    "editorLineNumber.activeForeground": "#d9e8e1",
    "editor.selectionBackground": "#1f4b3d",
    "editor.inactiveSelectionBackground": "#1a2c25",
    "editorGutter.background": "#0f1412",
    "editorWidget.background": "#121917",
    "editorHoverWidget.background": "#121917",
    "scrollbarSlider.background": "#35524866",
    "scrollbarSlider.hoverBackground": "#4d726699",
    "scrollbarSlider.activeBackground": "#6b9586cc",
    "diffEditor.insertedTextBackground": "#1f4d36aa",
    "diffEditor.removedTextBackground": "#5a232baa",
    "diffEditor.insertedLineBackground": "#14291f",
    "diffEditor.removedLineBackground": "#2a171c",
    "diffEditor.diagonalFill": "#141a18",
    "diffEditor.border": "#22312b",
  },
})

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
