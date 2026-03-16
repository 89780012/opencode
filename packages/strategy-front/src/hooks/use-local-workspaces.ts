import { useCallback, useEffect, useState } from "react";
import { workspaceApi } from "@/api/modules/workspace";
import type { LocalWorkspace } from "@/types/workspace";

interface UseLocalWorkspacesResult {
  loading: boolean;
  error: string | null;
  basePath: string;
  workspaces: LocalWorkspace[];
  refresh: () => Promise<void>;
}

export function useLocalWorkspaces(): UseLocalWorkspacesResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState("");
  const [workspaces, setWorkspaces] = useState<LocalWorkspace[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await workspaceApi.getLocalWorkspaces();
      setBasePath(data.base_path);
      setWorkspaces(
        (data.workspaces ?? []).map((workspace) => ({
          ...workspace,
          keywords: workspace.keywords ?? [],
        })),
      );
    } catch (e) {
      console.error("failed to load local workspaces", e);
      setError("失败加载工作空间");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    basePath,
    workspaces,
    refresh,
  };
}
