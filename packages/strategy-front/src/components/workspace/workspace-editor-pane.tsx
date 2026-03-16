import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { workspaceApi } from "@/api/modules/workspace";
import { WorkspaceCodeEditor } from "@/components/workspace/workspace-code-editor";
import { WorkspaceFileTree } from "@/components/workspace/workspace-file-tree";
import type { LocalWorkspace } from "@/types/workspace";

interface WorkspaceEditorPaneProps {
  workspace: LocalWorkspace;
}

export function WorkspaceEditorPane({ workspace }: WorkspaceEditorPaneProps) {
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [originalFiles, setOriginalFiles] = useState<Record<string, string>>(
    {},
  );
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [loadedFiles, setLoadedFiles] = useState<Record<string, true>>({});
  const loadedFilesRef = useRef<Record<string, true>>({});
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFileLoading, setActiveFileLoading] = useState(false);
  const [activeFileError, setActiveFileError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWorkspaceFiles = async () => {
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      setActiveFileError(null);
      setCompareMode(false);

      try {
        const data = await workspaceApi.getWorkspaceFiles(workspace.path);
        if (cancelled) {
          return;
        }

        const paths = (data.files ?? []).map((file) => file.path).sort();
        const firstPath = paths[0] ?? null;

        setFilePaths(paths);
        setOriginalFiles({});
        setDraftFiles({});
        setLoadedFiles({});
        loadedFilesRef.current = {};
        setActiveFilePath(firstPath);
      } catch (error) {
        console.error("failed to load workspace files", error);
        if (!cancelled) {
          setFilePaths([]);
          setOriginalFiles({});
          setDraftFiles({});
          setLoadedFiles({});
          loadedFilesRef.current = {};
          setActiveFilePath(null);
          setWorkspaceError("Failed to load workspace files");
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    };

    void loadWorkspaceFiles();
    return () => {
      cancelled = true;
    };
  }, [workspace.path]);

  useEffect(() => {
    loadedFilesRef.current = loadedFiles;
  }, [loadedFiles]);

  useEffect(() => {
    let cancelled = false;
    if (!activeFilePath) {
      setActiveFileLoading(false);
      setActiveFileError(null);
      return () => {
        cancelled = true;
      };
    }

    if (loadedFilesRef.current[activeFilePath]) {
      setActiveFileLoading(false);
      setActiveFileError(null);
      return () => {
        cancelled = true;
      };
    }

    const currentPath = activeFilePath;
    const loadFileContent = async () => {
      setActiveFileLoading(true);
      setActiveFileError(null);
      try {
        const data = await workspaceApi.getWorkspaceFileContent(
          workspace.path,
          currentPath,
        );
        if (cancelled) {
          return;
        }

        setOriginalFiles((prev) => ({
          ...prev,
          [currentPath]: data.content ?? "",
        }));
        setDraftFiles((prev) => ({
          ...prev,
          [currentPath]: data.content ?? "",
        }));
        setLoadedFiles((prev) => ({
          ...prev,
          [currentPath]: true,
        }));
      } catch (error) {
        console.info("failed to load workspace file content", error);
        if (!cancelled) {
          setActiveFileError("文件不支持预览");
        }
      } finally {
        if (!cancelled) {
          setActiveFileLoading(false);
        }
      }
    };

    void loadFileContent();
    return () => {
      cancelled = true;
    };
  }, [activeFilePath, workspace.path]);

  const activeDraft = activeFilePath ? (draftFiles[activeFilePath] ?? "") : "";
  const activeOriginal = activeFilePath
    ? (originalFiles[activeFilePath] ?? "")
    : "";
  const activeChanged =
    Boolean(activeFilePath) && activeDraft !== activeOriginal;

  const handleRestoreActiveFile = () => {
    if (!activeFilePath) {
      return;
    }

    const originalValue = originalFiles[activeFilePath] ?? "";
    setDraftFiles((prev) => {
      if (prev[activeFilePath] === originalValue) {
        return prev;
      }
      return {
        ...prev,
        [activeFilePath]: originalValue,
      };
    });
  };

  return (
    <div className="h-full w-full min-w-0 border-r bg-background">
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="truncate" title={workspace.path}>
            {workspace.path}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={compareMode ? "secondary" : "outline"}
              disabled={!activeFilePath}
              onClick={() => setCompareMode((prev) => !prev)}
            >
              {compareMode ? "退出差异比对" : "差异比对"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!activeFilePath || !activeChanged}
              onClick={handleRestoreActiveFile}
            >
              恢复
            </Button>
            {activeChanged ? (
              <span className="text-[10px] text-amber-600">已修改</span>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1">
          <WorkspaceFileTree
            filePaths={filePaths}
            draftFiles={draftFiles}
            originalFiles={originalFiles}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
          />
          <WorkspaceCodeEditor
            loading={workspaceLoading || activeFileLoading}
            error={workspaceError || activeFileError}
            activeFilePath={activeFilePath}
            compareMode={compareMode}
            draftFiles={draftFiles}
            originalFiles={originalFiles}
            onContentChange={(path, content) => {
              setDraftFiles((prev) => {
                if (prev[path] === content) {
                  return prev;
                }
                return {
                  ...prev,
                  [path]: content,
                };
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
