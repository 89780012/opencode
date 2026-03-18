import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { workspaceApi } from "@/api/modules/workspace"
import { Button } from "@/components/ui/button"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTabs } from "@/components/workspace/workspace-file-tabs"
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
  const [open, setOpen] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [errs, setErrs] = useState<Record<string, string | null>>({})
  const cur = useRef(props.workspace.path)
  const last = useRef<string | null>(null)
  const openRef = useRef<string[]>([])
  const activeRef = useRef<string | null>(null)

  useEffect(() => {
    cur.current = props.workspace.path
  }, [props.workspace.path])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const same = last.current === props.workspace.path
    if (!same) {
      setPaths([])
      setFiles({})
      setBusy({})
      setErrs({})
      setOpen([])
      setActive(null)
    }

    try {
      const data = await workspaceApi.getWorkspaceFiles(props.workspace.path)
      const next = (data.files ?? []).map((item) => item.path).sort()
      const seen = new Set(next)

      setPaths(next)

      if (!same) {
        const path = next[0] ?? null
        setFiles({})
        setBusy({})
        setErrs({})
        setOpen(path ? [path] : [])
        setActive(path)
        last.current = props.workspace.path
        return
      }

      const open = openRef.current.filter((path) => seen.has(path))
      const active = activeRef.current && seen.has(activeRef.current) ? activeRef.current : (open[0] ?? null)

      setFiles((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setBusy((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setErrs((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setOpen(open)
      setActive(active)
      last.current = props.workspace.path
    } catch (err) {
      console.error("failed to load workspace files", err)
      setPaths([])
      setFiles({})
      setError("失败加载工作区文件")
    } finally {
      setLoading(false)
    }
  }, [props.workspace.path])

  useEffect(() => {
    void load()
  }, [load])

  const show = useCallback((path: string) => {
    setOpen((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActive(path)
  }, [])

  const drop = useCallback((path: string) => {
    const open = openRef.current
    const at = open.indexOf(path)
    const next = open.filter((item) => item !== path)

    setOpen(next)

    if (activeRef.current === path) {
      setActive(open[at + 1] ?? open[at - 1] ?? null)
      return
    }

    if (activeRef.current && !next.includes(activeRef.current)) {
      setActive(next[0] ?? null)
    }
  }, [])

  const read = useCallback(
    async (path: string) => {
      if (files[path] || busy[path]) {
        return
      }

      const base = props.workspace.path
      setBusy((prev) => ({ ...prev, [path]: true }))
      setErrs((prev) => ({ ...prev, [path]: null }))

      try {
        const data = await workspaceApi.getWorkspaceFileContent(base, path)
        if (cur.current !== base) {
          return
        }

        setFiles((prev) => ({
          ...prev,
          [path]: data,
        }))
      } catch (err) {
        console.error("failed to load workspace file content", err)
        if (cur.current === base) {
          setErrs((prev) => ({
            ...prev,
            [path]: "这个文件不支持预览",
          }))
        }
      } finally {
        if (cur.current === base) {
          setBusy((prev) => ({
            ...prev,
            [path]: false,
          }))
        }
      }
    },
    [busy, files, props.workspace.path],
  )

  useEffect(() => {
    if (!active || files[active] || busy[active]) {
      return
    }

    void read(active)
  }, [active, busy, files, read])

  const file = active ? (files[active] ?? null) : null
  const fileError = active ? (errs[active] ?? null) : null
  const fileLoading = active ? (busy[active] ?? false) : false

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {props.readonly ? (
            <span className="rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.16em]">Read only</span>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" />
            {loading ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceFileTabs open={open} active={active} onPick={setActive} onClose={drop} />
          <WorkspaceCodeEditor
            loading={loading || fileLoading}
            error={error || fileError}
            activeFilePath={active}
            file={file}
          />
        </div>
        <WorkspaceFileTree filePaths={paths} activeFilePath={active} onSelectFile={show} />
      </div>
    </div>
  )
}
