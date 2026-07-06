import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
import { log } from "@/lib/error"
import { init, reduce } from "@/lib/workspace-editor-reducer"
import type { LocalWorkspace } from "@/types/workspace"

type Input = {
  workspace: LocalWorkspace | null
  path?: string | null
  readonly?: boolean
}

/**
 * 统一管理工作区文件的读取、编辑和保存状态。
 */
export function useWorkspaceEditor(input: Input) {
  const [state, dispatch] = useReducer(reduce, input.workspace?.path ?? "", init)
  const cur = useRef(input.workspace?.path ?? "")
  const last = useRef<string | null>(null)

  useEffect(() => {
    cur.current = input.workspace?.path ?? ""
  }, [input.workspace?.path])

  /**
   * 加载当前工作区的文件列表，并在切换工作区时重置编辑状态。
   */
  const load = useCallback(
    async (force?: boolean) => {
      if (!input.workspace) {
        return
      }

      const ws = input.workspace.path
      const reset = last.current !== ws
      dispatch({ type: "load_start", ws, reset })

      try {
        const data = await workspaceApi.getWorkspaceFiles(ws)
        if (cur.current !== ws) {
          return
        }

        const paths = (data.files ?? []).map((item) => item.path).sort()
        const seen = new Set(paths)
        const active = reset ? (input.path && seen.has(input.path) ? input.path : (paths[0] ?? null)) : null
        dispatch({ type: "files_loaded", ws, paths, active, force: !!force })
        last.current = ws
      } catch (err) {
        log("加载工作区文件列表失败", err)
        if (cur.current === ws) {
          dispatch({ type: "load_failed", ws, error: "加载工作区文件失败" })
          last.current = ws
        }
      }
    },
    [input.path, input.workspace],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!input.path || !state.paths.includes(input.path)) {
      return
    }
    dispatch({ type: "tab_opened", path: input.path })
  }, [input.path, state.paths])

  /**
   * 主动打开一个文件并切到对应标签页。
   */
  const show = useCallback((path: string) => {
    if (!state.paths.includes(path)) {
      return
    }
    dispatch({ type: "tab_opened", path })
  }, [state.paths])

  /**
   * 切换当前激活的文件标签。
   */
  const setActive = useCallback((path: string | null) => {
    dispatch({ type: "active_set", path })
  }, [])

  /**
   * 关闭一个已打开的文件标签。
   */
  const close = useCallback((path: string) => {
    dispatch({ type: "tab_closed", path })
  }, [])

  /**
   * 读取单个文件内容，并同步到草稿状态。
   */
  const read = useCallback(
    async (path: string, force?: boolean) => {
      if (!input.workspace || !state.paths.includes(path) || state.busy[path] || (state.files[path] && !force)) {
        return
      }

      const ws = input.workspace.path
      dispatch({ type: "file_load_started", path })

      try {
        const data = await workspaceApi.getWorkspaceFileContent(ws, path)
        if (cur.current !== ws) {
          return
        }
        dispatch({ type: "file_load_succeeded", path, data })
      } catch (err) {
        log("加载工作区文件内容失败", err)
        if (cur.current === ws) {
          dispatch({ type: "file_load_failed", path, error: "这个文件暂不支持预览" })
        }
      }
    },
    [input.workspace, state.busy, state.files, state.paths],
  )

  useEffect(() => {
    if (!state.active || !state.paths.includes(state.active) || state.files[state.active] || state.busy[state.active]) {
      return
    }
    void read(state.active)
  }, [read, state.active, state.busy, state.files, state.paths])

  /**
   * 更新当前文件草稿，并标记是否存在未保存修改。
   */
  const change = useCallback(
    (value: string) => {
      if (!state.active) {
        return
      }
      dispatch({ type: "draft_changed", path: state.active, value })
    },
    [state.active],
  )

  /**
   * 保存指定文件，未传入路径时默认保存当前激活文件。
   */
  const save = useCallback(
    async (path?: string) => {
      if (!input.workspace || input.readonly) {
        return
      }

      const next = path ?? state.active
      if (!next) {
        return
      }

      const file = state.files[next]
      if (!file?.previewable || file.binary || file.truncated || !state.dirty[next]) {
        return
      }

      const body = state.drafts[next] ?? file.content
      const ws = input.workspace.path
      dispatch({ type: "save_started", path: next })

      try {
        const data = await workspaceApi.saveWorkspaceFileContent(ws, next, body)
        if (cur.current !== ws) {
          return
        }
        dispatch({ type: "save_succeeded", path: next, data })
        toast.success(`已保存 ${next}`)
      } catch (err) {
        log("保存工作区文件失败", err)
        if (cur.current === ws) {
          dispatch({ type: "save_failed", path: next, error: "保存文件失败" })
        }
        toast.error("保存文件失败")
      }
    },
    [input.readonly, input.workspace, state.active, state.dirty, state.drafts, state.files],
  )

  /**
   * 顺序保存当前工作区内所有未保存文件。
   */
  const saveAll = useCallback(async () => {
    const list = Object.keys(state.dirty).filter((path) => state.dirty[path])
    await list.reduce((task, path) => task.then(() => save(path)), Promise.resolve())
  }, [save, state.dirty])

  const file = state.active ? (state.files[state.active] ?? null) : null
  const fileError = state.active ? (state.errs[state.active] ?? null) : null
  const fileLoading = state.active ? (state.busy[state.active] ?? false) : false
  const fileSaving = state.active ? (state.saving[state.active] ?? false) : false
  const value = state.active ? (state.drafts[state.active] ?? state.files[state.active]?.content ?? "") : ""
  const lock = !!input.readonly || !!file?.binary || !!file?.truncated || (!file?.previewable && !fileLoading)
  const dirtyCount = Object.values(state.dirty).filter(Boolean).length
  const savingAny = Object.values(state.saving).some(Boolean)

  return useMemo(
    () => ({
      ...state,
      file,
      fileError,
      fileLoading,
      fileSaving,
      value,
      lock,
      dirtyCount,
      savingAny,
      load,
      show,
      setActive,
      close,
      read,
      change,
      save,
      saveAll,
    }),
    [change, close, dirtyCount, file, fileError, fileLoading, fileSaving, load, lock, read, save, saveAll, savingAny, setActive, show, state, value],
  )
}
