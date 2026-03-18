import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import { workspaceApi } from "@/api/modules/workspace"
import { Button } from "@/components/ui/button"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree"
import type { LocalWorkspace, WorkspaceFileContentResponse } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  readonly?: boolean
}

export function WorkspaceEditorPane(props: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paths, setPaths] = useState<string[]>([])
  const [files, setFiles] = useState<Record<string, WorkspaceFileContentResponse>>({})
  const [pick, setPick] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFileError(null)

    try {
      const data = await workspaceApi.getWorkspaceFiles(props.workspace.path)
      const next = (data.files ?? []).map((item) => item.path).sort()
      setPaths(next)
      setFiles({})
      setPick(next[0] ?? null)
    } catch (err) {
      console.error("failed to load workspace files", err)
      setPaths([])
      setFiles({})
      setPick(null)
      setError("失败加载工作区文件")
    } finally {
      setLoading(false)
    }
  }, [props.workspace.path])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!pick || files[pick]) {
      setFileLoading(false)
      setFileError(null)
      return
    }

    let done = false

    const read = async () => {
      setFileLoading(true)
      setFileError(null)

      try {
        const data = await workspaceApi.getWorkspaceFileContent(props.workspace.path, pick)
        if (done) {
          return
        }

        setFiles((prev) => ({
          ...prev,
          [pick]: data,
        }))
      } catch (err) {
        console.error("failed to load workspace file content", err)
        if (!done) {
          setFileError("文件不支持预览.")
        }
      } finally {
        if (!done) {
          setFileLoading(false)
        }
      }
    }

    void read()
    return () => {
      done = true
    }
  }, [files, pick, props.workspace.path])

  const file = useMemo(() => (pick ? (files[pick] ?? null) : null), [files, pick])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {props.readonly ? (
            <span className="rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.16em]">只读</span>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" />
            {loading ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        <WorkspaceCodeEditor
          loading={loading || fileLoading}
          error={error || fileError}
          activeFilePath={pick}
          file={file}
        />
        <WorkspaceFileTree filePaths={paths} activeFilePath={pick} onSelectFile={setPick} />
      </div>
    </div>
  )
}
