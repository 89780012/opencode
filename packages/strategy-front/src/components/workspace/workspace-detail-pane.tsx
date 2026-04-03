import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronRight, Columns2, GitCompare, RefreshCw, Rows2, Save, X } from "lucide-react"
import { toast } from "sonner"
import { workspaceApi } from "@/api/modules/workspace"
import { ReviewDiffViewer } from "@/components/review/review-diff-viewer"
import { ReviewFileList } from "@/components/review/review-file-list"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTabs } from "@/components/workspace/workspace-file-tabs"
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree"
import { useChatReview } from "@/hooks/use-chat-review"
import { cn } from "@/lib/utils"
import type { LocalWorkspace, WorkspaceFileContentResponse } from "@/types/workspace"

export type WorkspaceDetailTab = "review" | "files"
type Filter = "all" | "changed"

interface Props {
  open: boolean
  tab: WorkspaceDetailTab
  workspace: LocalWorkspace | null
  sessionId?: string | null
  file?: string | null
  onTab: (value: WorkspaceDetailTab) => void
  onOpenChange: (open: boolean) => void
}

export function WorkspaceDetailPane(props: Props) {
  const review = useChatReview(props.workspace?.path, props.sessionId, props.open && props.tab === "review")
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paths, setPaths] = useState<string[]>([])
  const [files, setFiles] = useState<Record<string, WorkspaceFileContentResponse>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errs, setErrs] = useState<Record<string, string | null>>({})
  const cur = useRef(props.workspace?.path ?? "")
  const last = useRef<string | null>(null)
  const openRef = useRef<string[]>([])
  const activeRef = useRef<string | null>(null)

  useEffect(() => {
    cur.current = props.workspace?.path ?? ""
  }, [props.workspace?.path])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const load = useCallback(async () => {
    if (!props.workspace) {
      return
    }

    setLoading(true)
    setError(null)

    const same = last.current === props.workspace.path
    if (!same) {
      setPaths([])
      setFiles({})
      setDrafts({})
      setDirty({})
      setBusy({})
      setSaving({})
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
        const path = props.file && seen.has(props.file) ? props.file : (next[0] ?? null)
        setFiles({})
        setDrafts({})
        setDirty({})
        setBusy({})
        setSaving({})
        setErrs({})
        setOpen(path ? [path] : [])
        setActive(path)
        last.current = props.workspace.path
        return
      }

      const open = openRef.current.filter((path) => seen.has(path))
      const active = activeRef.current && seen.has(activeRef.current) ? activeRef.current : (open[0] ?? null)

      setFiles((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setDirty((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path) && prev[path])))
      setBusy((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setSaving((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setErrs((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => seen.has(path))))
      setOpen(open)
      setActive(active)
      last.current = props.workspace.path
    } catch (err) {
      console.error("failed to load workspace files", err)
      setPaths([])
      setFiles({})
      setDrafts({})
      setDirty({})
      setSaving({})
      setError("加载工作区文件失败")
    } finally {
      setLoading(false)
    }
  }, [props.file, props.workspace])

  useEffect(() => {
    void load()
  }, [load])

  const show = useCallback((path: string) => {
    setOpen((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActive(path)
  }, [])

  useEffect(() => {
    if (!props.open || !props.file) {
      return
    }

    review.open(props.file)
    show(props.file)
  }, [props.file, props.open, review, show])

  const tree = useMemo(() => {
    if (filter === "all" || review.diffs.length === 0) {
      return paths
    }
    const seen = new Set(review.diffs.map((item) => item.file))
    return paths.filter((item) => seen.has(item))
  }, [filter, paths, review.diffs])

  useEffect(() => {
    if (!active || tree.includes(active)) {
      return
    }
    setActive(tree[0] ?? null)
  }, [active, tree])

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
      if (!props.workspace || files[path] || busy[path]) {
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

        setFiles((prev) => ({ ...prev, [path]: data }))
        setDrafts((prev) => (path in prev ? prev : { ...prev, [path]: data.content }))
      } catch (err) {
        console.error("failed to load workspace file content", err)
        if (cur.current === base) {
          setErrs((prev) => ({ ...prev, [path]: "这个文件暂不支持预览" }))
        }
      } finally {
        if (cur.current === base) {
          setBusy((prev) => ({ ...prev, [path]: false }))
        }
      }
    },
    [busy, files, props.workspace],
  )

  useEffect(() => {
    if (!active || files[active] || busy[active]) {
      return
    }

    void read(active)
  }, [active, busy, files, read])

  const change = useCallback(
    (value: string) => {
      if (!active) {
        return
      }

      setDrafts((prev) => ({ ...prev, [active]: value }))
      setDirty((prev) => ({ ...prev, [active]: value !== (files[active]?.content ?? "") }))
    },
    [active, files],
  )

  const save = useCallback(async () => {
    if (!props.workspace || !active) {
      return
    }

    const file = files[active]
    if (!file?.previewable || file.binary || file.truncated || !dirty[active]) {
      return
    }

    const body = drafts[active] ?? file.content
    const base = props.workspace.path
    setSaving((prev) => ({ ...prev, [active]: true }))
    setErrs((prev) => ({ ...prev, [active]: null }))

    try {
      const data = await workspaceApi.saveWorkspaceFileContent(base, active, body)
      if (cur.current !== base) {
        return
      }

      setFiles((prev) => ({ ...prev, [active]: data }))
      setDrafts((prev) => ({ ...prev, [active]: data.content }))
      setDirty((prev) => ({ ...prev, [active]: false }))
      toast.success(`已保存 ${active}`)
    } catch (err) {
      console.error("failed to save workspace file content", err)
      if (cur.current === base) {
        setErrs((prev) => ({ ...prev, [active]: "保存文件失败" }))
      }
      toast.error("保存文件失败")
    } finally {
      if (cur.current === base) {
        setSaving((prev) => ({ ...prev, [active]: false }))
      }
    }
  }, [active, dirty, drafts, files, props.workspace])

  if (!props.workspace) {
    return null
  }

  const file = active ? (files[active] ?? null) : null
  const fileError = active ? (errs[active] ?? null) : null
  const fileLoading = active ? (busy[active] ?? false) : false
  const fileSaving = active ? (saving[active] ?? false) : false
  const value = active ? (drafts[active] ?? files[active]?.content ?? "") : ""
  const lock = !!file?.truncated || (!file?.previewable && !fileLoading)
  const count = Object.values(dirty).filter(Boolean).length

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,#fcfcfb,#f7f7f4)] dark:bg-[linear-gradient(180deg,#101514,#0f1211)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{props.workspace.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{review.diffs.length} 变更</span>
            <span className="truncate">{props.workspace.path}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => props.onOpenChange(false)}>
          <X className="size-4" />
        </Button>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="strategy-front:workspace-detail-pane:v2"
        className="min-h-0 min-w-0 flex-1"
      >
        <ResizablePanel defaultSize={76} minSize={420} className="min-h-0 min-w-0">
          {props.tab === "files" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <WorkspaceFileTabs
                open={open}
                active={active}
                onPick={setActive}
                onClose={drop}
                side={
                  <>
                    {count > 0 ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-700">
                        {count} 未保存
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void save()}
                      disabled={lock || !active || !dirty[active] || fileSaving}
                    >
                      <Save className="size-4" />
                      {fileSaving ? "保存中..." : "保存"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                      <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                      {loading ? "刷新中..." : "刷新"}
                    </Button>
                  </>
                }
              />
              <WorkspaceCodeEditor
                loading={loading || fileLoading}
                error={error || fileError}
                activeFilePath={active}
                file={file}
                value={value}
                readonly={lock}
                onChange={change}
                onSave={() => {
                  void save()
                }}
              />
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {review.err ? (
                <div className="border-b bg-red-50 px-3 py-2 text-xs text-red-700">{review.err}</div>
              ) : null}
              <ReviewDiffViewer diff={review.diff} mode={review.mode} loading={review.loading} />
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle className="pointer" />

        <ResizablePanel defaultSize={24} minSize={260} className="min-h-0 min-w-0">
          <div className="flex h-full min-h-0 min-w-0 flex-col border-l bg-muted/10">
            <div className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <Tabs
                  value={props.tab}
                  onValueChange={(value) => props.onTab(value as WorkspaceDetailTab)}
                  className="gap-0"
                >
                  <TabsList className="h-8 rounded-lg bg-muted/70 p-1">
                    <TabsTrigger value="review" className="h-6 gap-1.5 rounded-md px-2.5 text-xs">
                      <GitCompare className="size-3.5" />
                      变更
                    </TabsTrigger>
                    <TabsTrigger value="files" className="h-6 gap-1.5 rounded-md px-2.5 text-xs">
                      <ChevronRight className="size-3.5" />
                      文件
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {props.tab === "files" ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <div className="truncate text-sm font-medium">文件树</div>
                    <div className="shrink-0 text-xs text-muted-foreground">{tree.length} 项</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                    {(["all", "changed"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFilter(item)}
                        className={cn(
                          "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                          filter === item
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {item === "all" ? "所有文件" : "仅变更"}
                      </button>
                    ))}
                  </div>
                </div>
                <WorkspaceFileTree
                  filePaths={tree}
                  activeFilePath={active}
                  onSelectFile={(path) => {
                    show(path)
                    if (review.diffs.some((item) => item.file === path)) {
                      review.open(path)
                    }
                  }}
                />
              </>
            ) : (
              <ReviewFileList
                diffs={review.diffs}
                file={review.file}
                loading={review.loading}
                onFile={(path) => {
                  review.open(path)
                  show(path)
                }}
                onRefresh={review.refresh}
                side={
                  <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                    <Button
                      size="icon-xs"
                      variant={review.mode === "split" ? "secondary" : "ghost"}
                      onClick={() => review.setMode("split")}
                      aria-label="Split diff"
                    >
                      <Columns2 className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant={review.mode === "unified" ? "secondary" : "ghost"}
                      onClick={() => review.setMode("unified")}
                      aria-label="Unified diff"
                    >
                      <Rows2 className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
