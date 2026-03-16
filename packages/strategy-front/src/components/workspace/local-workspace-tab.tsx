import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { LocalWorkspaceList } from "@/components/workspace/local-workspace-list";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useLocalWorkspaces } from "@/hooks/use-local-workspaces";
import { clearSelectedWorkspace } from "@/store/workspace-view-slice";

export function LocalWorkspaceTab() {
  const dispatch = useAppDispatch();
  const { loading, error, basePath, workspaces, refresh } =
    useLocalWorkspaces();
  const selectedWorkspacePath = useAppSelector(
    (state) => state.workspaceView.selectedWorkspace?.path,
  );

  useEffect(() => {
    if (!selectedWorkspacePath) {
      return;
    }

    const stillExists = workspaces.some(
      (workspace) => workspace.path === selectedWorkspacePath,
    );
    if (!stillExists) {
      dispatch(clearSelectedWorkspace());
    }
  }, [dispatch, selectedWorkspacePath, workspaces]);

  return (
    <>
      <SidebarHeader className="gap-3.5 border-b p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refresh();
          }}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          {loading ? "刷新中..." : "刷新工作空间"}
        </Button>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup className="h-full px-0">
          <SidebarGroupContent className="h-full overflow-hidden">
            <LocalWorkspaceList
              loading={loading}
              error={error}
              basePath={basePath}
              workspaces={workspaces}
              onRetry={() => {
                void refresh();
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
