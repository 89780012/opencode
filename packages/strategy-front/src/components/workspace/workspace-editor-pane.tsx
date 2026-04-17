import type { ReactNode } from "react"
import { useEffect, useMemo } from "react"
import { RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor"
import { WorkspaceFileTabs } from "@/components/workspace/workspace-file-tabs"
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree"
import { useWorkspaceEditor } from "@/hooks/use-workspace-editor"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  readonly?: boolean
  path?: string | null
  paths?: string[]
  side?: ReactNode
}

export function WorkspaceEditorPane(props: Props) {
  const editor = useWorkspaceEditor({
    workspace: props.workspace,
    path: props.path,
    readonly: props.readonly,
  })

  const tree = useMemo(() => {
    if (!props.paths || props.paths.length === 0) {
      return editor.paths
    }
    const seen = new Set(props.paths)
    return editor.paths.filter((item) => seen.has(item))
  }, [editor.paths, props.paths])

  useEffect(() => {
    if (!editor.active || tree.includes(editor.active)) {
      return
    }
    editor.setActive(tree[0] ?? null)
  }, [editor.active, editor.setActive, tree])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="strategy-front:workspace-editor-split:v2"
        className="min-h-0 min-w-0 flex-1"
      >
        <ResizablePanel defaultSize={76} minSize={420} className="min-h-0 min-w-0">
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
                    onClick={() => void editor.save()}
                    disabled={editor.lock || !editor.active || !editor.dirty[editor.active] || editor.fileSaving}
                  >
                    <Save className="size-4" />
                    {editor.fileSaving ? "保存中..." : "保存"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void editor.load(true)} disabled={editor.loading}>
                    <RefreshCw className={`size-4 ${editor.loading ? "animate-spin" : ""}`} />
                    {editor.loading ? "刷新中..." : "刷新"}
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
        </ResizablePanel>
        <ResizableHandle withHandle className="pointer" />
        <ResizablePanel defaultSize={24} minSize={240} className="min-h-0 min-w-0">
          <div className="workspace-sidepane flex h-full min-h-0 min-w-0 flex-col border-l border-slate-200 bg-slate-100 dark:border-[#2a312f] dark:bg-[#141918]">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">文件树</div>
                <div className="text-xs text-slate-500 dark:text-[#8d9b94]">{tree.length} 项</div>
              </div>
              {props.side}
            </div>
            <WorkspaceFileTree
              filePaths={tree}
              activeFilePath={editor.active}
              onSelectFile={editor.show}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
