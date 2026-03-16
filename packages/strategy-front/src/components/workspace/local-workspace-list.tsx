import { FolderCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { truncateString } from "@/lib/utils";
import { setSelectedWorkspace } from "@/store/workspace-view-slice";
import type { LocalWorkspace } from "@/types/workspace";

interface LocalWorkspaceListProps {
  basePath: string;
  loading: boolean;
  error: string | null;
  workspaces: LocalWorkspace[];
  onRetry: () => void;
}

export function LocalWorkspaceList({
  basePath,
  loading,
  error,
  workspaces,
  onRetry,
}: LocalWorkspaceListProps) {
  const dispatch = useAppDispatch();
  const selectedWorkspacePath = useAppSelector(
    (state) => state.workspaceView.selectedWorkspace?.path,
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在扫描本地策略目录...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          重新加载
        </Button>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm text-muted-foreground">未发现本地策略</p>
        <p className="text-xs text-muted-foreground">{basePath || "-"}</p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex h-full flex-col gap-2 overflow-x-hidden px-1">
      <p className="px-2 text-xs text-muted-foreground" title={basePath}>
        扫描目录: {truncateString(basePath, 30)}
      </p>
      {workspaces.map((workspace) => (
        <button
          key={workspace.path}
          type="button"
          onClick={() => dispatch(setSelectedWorkspace(workspace))}
          className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors hover:bg-muted/40 cursor-pointer ${
            selectedWorkspacePath === workspace.path
              ? "border-primary bg-primary/10"
              : ""
          }`}
        >
          <FolderCode className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{workspace.name}</p>
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
        </button>
      ))}
    </div>
  );
}
