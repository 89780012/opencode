import { FolderOpen, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LocalWorkspaceList } from "@/components/workspace/local-workspace-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { workspaceApi } from "@/api/modules/workspace";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useLocalWorkspaces } from "@/hooks/use-local-workspaces";
import {
  clearSelectedWorkspace,
  setSelectedWorkspace,
} from "@/store/workspace-view-slice";
import type { LocalWorkspace } from "@/types/workspace";

const pick = (workspace: LocalWorkspace, dispatch: ReturnType<typeof useAppDispatch>) => {
  dispatch(setSelectedWorkspace(workspace));
};

export function LocalWorkspaceTab() {
  const dispatch = useAppDispatch();
  const { loading, error, basePath, workspaces, refresh } = useLocalWorkspaces();
  const selectedPath = useAppSelector(
    (state) => state.workspaceView.selectedWorkspace?.path ?? null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    const ok = workspaces.some((workspace) => workspace.path === selectedPath);
    if (ok) {
      return;
    }
    dispatch(clearSelectedWorkspace());
  }, [dispatch, selectedPath, workspaces]);

  const onPick = (workspace: LocalWorkspace) => {
    pick(workspace, dispatch);
    setOpenOpen(false);
  };

  const onCreate = async () => {
    const next = name.trim();
    if (!next) {
      toast.error("请输入工作区名称");
      return;
    }

    setBusy(true);
    try {
      const data = await workspaceApi.createWorkspace(next);
      await refresh();
      pick(data.workspace, dispatch);
      setCreateOpen(false);
      setName("");
      toast.success(`已创建工作区 ${data.workspace.name}`);
    } catch (err) {
      console.error("Failed to create workspace", err);
      toast.error("创建工作区失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SidebarHeader className="gap-2 border-b p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            新建工作区
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpenOpen(true)}>
            <FolderOpen className="size-4" />
            打开文件夹
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            void refresh();
          }}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          {loading ? "刷新中..." : "刷新工作区"}
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
              selectedPath={selectedPath}
              onRetry={() => {
                void refresh();
              }}
              onSelect={onPick}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作区</DialogTitle>
            <DialogDescription>
              将在 {basePath || "~/.xtp-smart/plugins"} 下创建一个新文件夹，并立即打开它。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="输入工作区名称"
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                void onCreate();
              }}
            />
            <p className="text-xs text-muted-foreground">
              建议使用简短目录名，例如 `my-strategy`。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void onCreate()} disabled={busy}>
              {busy ? "创建中..." : "创建并打开"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openOpen} onOpenChange={setOpenOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>打开文件夹</DialogTitle>
            <DialogDescription>
              从 {basePath || "~/.xtp-smart/plugins"} 中选择一个已有工作区。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-hidden rounded-md border">
            <LocalWorkspaceList
              loading={loading}
              error={error}
              basePath={basePath}
              workspaces={workspaces}
              selectedPath={selectedPath}
              onRetry={() => {
                void refresh();
              }}
              onSelect={onPick}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
