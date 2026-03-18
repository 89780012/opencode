import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  workspace: LocalWorkspace
  onClose?: () => void
}

export function ChatWorkspacePanel(props: Props) {
  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-col bg-background">
      {/* <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold">Workspace</div>
          <div className="truncate text-xs text-muted-foreground" title={props.workspace.name}>
            {props.workspace.name}
          </div>
          <div className="truncate text-xs text-muted-foreground" title={props.workspace.path}>
            {props.workspace.path}
          </div>
        </div>
        {props.onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={props.onClose} aria-label="Close workspace panel">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <Separator /> */}
      <div className="min-h-0 min-w-0 flex-1">
        <WorkspaceEditorPane workspace={props.workspace} readonly />
      </div>
    </section>
  )
}
