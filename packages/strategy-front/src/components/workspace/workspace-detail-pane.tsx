import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, Columns2, GitCompare, RefreshCw, Rows2, Save, X } from "lucide-react"
import { ReviewDiffViewer } from "@/components/review/review-diff-viewer"
import { ReviewFileList } from "@/components/review/review-file-list"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTabs } from "@/components/workspace/workspace-file-tabs"
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree"
import { useChatReview } from "@/hooks/use-chat-review"
import { useWorkspaceEditor } from "@/hooks/use-workspace-editor"
import { cn } from "@/lib/utils"
import type { LocalWorkspace } from "@/types/workspace"

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
  const [filter, setFilter] = useState<Filter>("all")
  const editor = useWorkspaceEditor({
    workspace: props.workspace,
    path: props.file,
  })
  const review = useChatReview(
    props.workspace?.path,
    props.sessionId,
    props.open && (props.tab === "review" || (props.tab === "files" && filter === "changed")),
  )
  const show = useCallback(
    (path: string) => {
      editor.show(path)
    },
    [editor.show],
  )

  useEffect(() => {
    if (!props.open || !props.file) {
      return
    }

    review.open(props.file)
    show(props.file)
  }, [props.file, props.open, review.open, show])

  const tree = useMemo(() => {
    if (filter === "all") {
      return editor.paths
    }
    const seen = new Set(review.diffs.map((item) => item.file))
    return editor.paths.filter((item) => seen.has(item))
  }, [editor.paths, filter, review.diffs])

  useEffect(() => {
    if (!editor.active || tree.includes(editor.active)) {
      return
    }
    editor.setActive(tree[0] ?? null)
  }, [editor.active, editor.setActive, tree])

  const refresh = useCallback(async () => {
    if (filter === "changed") {
      await review.refresh()
      return
    }

    await editor.load(true)
  }, [editor.load, filter, review.refresh])

  if (!props.workspace) {
    return null
  }

  const refreshing = filter === "changed" ? review.loading : editor.loading

  return (
    <div className="workspace-detail-pane flex h-full min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,#fcfcfb,#f7f7f4)] dark:bg-[linear-gradient(180deg,#101514,#0f1211)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{props.workspace.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-[#8d9b94]">
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
                open={editor.open}
                active={editor.active}
                onPick={editor.setActive}
                onClose={editor.close}
                side={
                  <>
                    {editor.dirtyCount > 0 ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-700">
                        {editor.dirtyCount} 未保存
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void editor.saveAll()}
                      disabled={editor.dirtyCount === 0 || editor.savingAny}
                    >
                      <Save className="size-4" />
                      {editor.savingAny ? "保存中..." : editor.dirtyCount > 1 ? "全部保存" : "保存"}
                    </Button>
                  </>
                }
              />
              <WorkspaceCodeEditor
                loading={editor.loading || editor.fileLoading}
                error={editor.error || editor.fileError}
                activeFilePath={editor.active}
                file={editor.file}
                value={editor.value}
                readonly={editor.lock}
                onChange={editor.change}
                onSave={() => {
                  void editor.save()
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
          <div className="workspace-sidepane flex h-full min-h-0 min-w-0 flex-col border-l border-slate-200 bg-slate-100 dark:border-[#2a312f] dark:bg-[#141918]">
            <div className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <Tabs
                  value={props.tab}
                  onValueChange={(value) => props.onTab(value as WorkspaceDetailTab)}
                  className="workspace-pane-tabs gap-0"
                >
                  <TabsList className="workspace-pane-tabs-list h-8 rounded-lg border border-slate-200 bg-slate-200 p-1 dark:border-[#2a312f] dark:bg-[#1c2321]">
                    <TabsTrigger
                      value="review"
                      className="workspace-pane-tab h-6 gap-1.5 rounded-md px-2.5 text-xs text-slate-600 data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:text-[#96a49d] dark:data-[state=active]:border-[#2d3532] dark:data-[state=active]:bg-[#121716] dark:data-[state=active]:text-[#eef5f1]"
                    >
                      <GitCompare className="size-3.5" />
                      变更
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="workspace-pane-tab h-6 gap-1.5 rounded-md px-2.5 text-xs text-slate-600 data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:text-[#96a49d] dark:data-[state=active]:border-[#2d3532] dark:data-[state=active]:bg-[#121716] dark:data-[state=active]:text-[#eef5f1]"
                    >
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
                    <div className="shrink-0 text-xs text-slate-500 dark:text-[#8d9b94]">{tree.length} 项</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="workspace-filter flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-[#2a312f] dark:bg-[#111615]">
                      {(["all", "changed"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilter(item)}
                          className={cn(
                            "workspace-filter-option rounded px-2 py-1 text-[11px] font-medium transition-colors",
                            filter === item
                              ? "bg-slate-900 text-white dark:bg-[#e6eeea] dark:text-[#101514]"
                              : "text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-[#8d9b94] dark:hover:bg-[#202725] dark:hover:text-[#eef5f1]",
                          )}
                        >
                          {item === "all" ? "所有文件" : "仅变更"}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void refresh()}
                      disabled={refreshing}
                      className="workspace-pane-refresh h-7 px-2"
                    >
                      <RefreshCw className={cn("size-3.5", refreshing ? "animate-spin" : undefined)} />
                      刷新
                    </Button>
                  </div>
                </div>
                <WorkspaceFileTree
                  filePaths={tree}
                  activeFilePath={editor.active}
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
                  <div className="workspace-filter flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-[#2a312f] dark:bg-[#111615]">
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
