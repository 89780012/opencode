import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTabs } from "@/components/workspace/workspace-file-tabs"
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree"
import { init, reduce } from "@/lib/workspace-editor-reducer"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  readonly?: boolean
  path?: string | null
  paths?: string[]
  side?: ReactNode
}

export function WorkspaceEditorPane(props: Props) {
  const [state, dispatch] = useReducer(reduce, props.workspace.path, init)
  const cur = useRef(props.workspace.path)

  useEffect(() => {
    cur.current = props.workspace.path
  }, [props.workspace.path])

  const load = useCallback(
    async (force?: boolean) => {
      const ws = props.workspace.path
      const reset = state.ws !== ws
      dispatch({ type: "load_start", ws, reset })

      try {
        const data = await workspaceApi.getWorkspaceFiles(ws)
        if (cur.current !== ws) {
          return
        }
        const paths = (data.files ?? []).map((item) => item.path).sort()
        const seen = new Set(paths)
        const active = reset ? (props.path && seen.has(props.path) ? props.path : (paths[0] ?? null)) : null
        dispatch({ type: "files_loaded", ws, paths, active, force: !!force })
      } catch (err) {
        console.error("failed to load workspace files", err)
        if (cur.current === ws) {
          dispatch({ type: "load_failed", ws, error: "加载工作区文件失败" })
        }
      }
    },
    [props.path, props.workspace.path, state.ws],
  )

  useEffect(() => {
    void load()
  }, [load])

  const tree = useMemo(() => {
    if (!props.paths || props.paths.length === 0) {
      return state.paths
    }
    const seen = new Set(props.paths)
    return state.paths.filter((item) => seen.has(item))
  }, [props.paths, state.paths])

  useEffect(() => {
    if (!props.path || !tree.includes(props.path)) {
      return
    }
    dispatch({ type: "tab_opened", path: props.path })
  }, [props.path, tree])

  useEffect(() => {
    if (!state.active || tree.includes(state.active)) {
      return
    }
    dispatch({ type: "active_set", path: tree[0] ?? null })
  }, [state.active, tree])

  const read = useCallback(
    async (path: string, force?: boolean) => {
      if (state.busy[path] || (state.files[path] && !force)) {
        return
      }

      const ws = props.workspace.path
      dispatch({ type: "file_load_started", path })

      try {
        const data = await workspaceApi.getWorkspaceFileContent(ws, path)
        if (cur.current !== ws) {
          return
        }
        dispatch({ type: "file_load_succeeded", path, data })
      } catch (err) {
        console.error("failed to load workspace file content", err)
        if (cur.current === ws) {
          dispatch({ type: "file_load_failed", path, error: "这个文件暂不支持预览" })
        }
      }
    },
    [props.workspace.path, state.busy, state.files],
  )

  useEffect(() => {
    if (!state.active || state.files[state.active] || state.busy[state.active]) {
      return
    }
    void read(state.active)
  }, [read, state.active, state.busy, state.files])

  const change = useCallback(
    (value: string) => {
      if (!state.active) {
        return
      }
      dispatch({ type: "draft_changed", path: state.active, value })
    },
    [state.active],
  )

  const save = useCallback(async () => {
    if (!state.active || props.readonly) {
      return
    }

    const file = state.files[state.active]
    if (!file?.previewable || file.binary || file.truncated || !state.dirty[state.active]) {
      return
    }

    const path = state.active
    const body = state.drafts[path] ?? file.content
    const ws = props.workspace.path
    dispatch({ type: "save_started", path })

    try {
      const data = await workspaceApi.saveWorkspaceFileContent(ws, path, body)
      if (cur.current !== ws) {
        return
      }
      dispatch({ type: "save_succeeded", path, data })
      toast.success(`已保存 ${path}`)
    } catch (err) {
      console.error("failed to save workspace file content", err)
      if (cur.current === ws) {
        dispatch({ type: "save_failed", path, error: "保存文件失败" })
      }
      toast.error("保存文件失败")
    }
  }, [props.readonly, props.workspace.path, state.active, state.dirty, state.drafts, state.files])

  const file = state.active ? (state.files[state.active] ?? null) : null
  const fileError = state.active ? (state.errs[state.active] ?? null) : null
  const fileLoading = state.active ? (state.busy[state.active] ?? false) : false
  const fileSaving = state.active ? (state.saving[state.active] ?? false) : false
  const value = state.active ? (state.drafts[state.active] ?? state.files[state.active]?.content ?? "") : ""
  const lock = !!props.readonly || !!file?.truncated || (!file?.previewable && !fileLoading)
  const count = useMemo(() => Object.values(state.dirty).filter(Boolean).length, [state.dirty])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <ResizablePanelGroup direction="horizontal" autoSaveId="strategy-front:workspace-editor-split:v2" className="min-h-0 min-w-0 flex-1">
        <ResizablePanel defaultSize={76} minSize={420} className="min-h-0 min-w-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <WorkspaceFileTabs
              open={state.open}
              active={state.active}
              onPick={(path) => dispatch({ type: "active_set", path })}
              onClose={(path) => dispatch({ type: "tab_closed", path })}
              side={
                <>
                  {count > 0 ? (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-700">
                      {count} 未保存
                    </span>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => void save()} disabled={lock || !state.active || !state.dirty[state.active] || fileSaving}>
                    <Save className="size-4" />
                    {fileSaving ? "保存中..." : "保存"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={state.loading}>
                    <RefreshCw className={`size-4 ${state.loading ? "animate-spin" : ""}`} />
                    {state.loading ? "刷新中..." : "刷新"}
                  </Button>
                </>
              }
            />
            <WorkspaceCodeEditor
              loading={state.loading || fileLoading}
              error={state.error || fileError}
              activeFilePath={state.active}
              file={file}
              value={value}
              readonly={lock}
              onChange={change}
              onSave={() => {
                void save()
              }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="pointer" />
        <ResizablePanel defaultSize={24} minSize={240} className="min-h-0 min-w-0">
          <div className="flex h-full min-h-0 min-w-0 flex-col border-l bg-muted/10">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">文件树</div>
                <div className="text-xs text-muted-foreground">{tree.length} 项</div>
              </div>
              {props.side}
            </div>
            <WorkspaceFileTree
              filePaths={tree}
              activeFilePath={state.active}
              onSelectFile={(path) => dispatch({ type: "tab_opened", path })}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
