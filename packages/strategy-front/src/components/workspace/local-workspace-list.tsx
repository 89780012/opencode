import { FolderCode, LoaderCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { truncateString } from "@/lib/utils"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  basePath: string
  loading: boolean
  error: string | null
  workspaces: LocalWorkspace[]
  selectedPath: string | null
  initingPath?: string | null
  onRetry: () => void
  onSelect: (workspace: LocalWorkspace) => void
  onInitGit: (workspace: LocalWorkspace) => void
}

export function LocalWorkspaceList(props: Props) {
  if (props.loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">扫描本地工作区中...</div>
    )
  }

  if (props.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{props.error}</p>
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    )
  }

  if (props.workspaces.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm text-muted-foreground">未找到工作区</p>
        <p className="text-xs text-muted-foreground">{props.basePath || "-"}</p>
      </div>
    )
  }

  return (
    <div className="custom-scrollbar flex h-full flex-col gap-2 overflow-x-hidden px-1">
      <p className="px-2 text-xs text-muted-foreground" title={props.basePath}>
        根目录: {truncateString(props.basePath, 30)}
      </p>
      {props.workspaces.map((workspace) => (
        <div
          key={workspace.path}
          role="button"
          tabIndex={0}
          onClick={() => props.onSelect(workspace)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return
            }
            event.preventDefault()
            props.onSelect(workspace)
          }}
          className={`flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors hover:bg-muted/40 ${
            props.selectedPath === workspace.path ? "border-primary bg-primary/10" : ""
          }`}
        >
          <FolderCode className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{workspace.name}</p>
              <span
                className={
                  workspace.vcs === "git"
                    ? "shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] leading-none text-emerald-700"
                    : "shrink-0"
                }
              >
                {workspace.vcs === "git" ? (
                  "Git"
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      props.onInitGit(workspace)
                    }}
                    className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] leading-none text-amber-700 transition-colors hover:bg-amber-100"
                    disabled={props.initingPath === workspace.path}
                  >
                    {props.initingPath === workspace.path ? (
                      <span className="inline-flex items-center gap-1">
                        <LoaderCircle className="size-3 animate-spin" />
                        初始化git
                      </span>
                    ) : (
                      "初始化git"
                    )}
                  </button>
                )}
              </span>
            </div>
            {workspace.keywords.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {workspace.keywords.map((keyword) => (
                  <span
                    key={`${workspace.path}-${keyword}`}
                    className="rounded-sm border px-1.5 py-0.5 text-[10px] leading-none"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
