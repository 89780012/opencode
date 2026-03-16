import { useCallback, useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {
  DiffEditor,
  Editor,
  loader,
  type MonacoDiffEditor,
} from "@monaco-editor/react";
import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";

loader.config({ monaco });

interface WorkspaceCodeEditorProps {
  loading: boolean;
  error: string | null;
  activeFilePath: string | null;
  compareMode: boolean;
  draftFiles: Record<string, string>;
  originalFiles: Record<string, string>;
  onContentChange: (path: string, content: string) => void;
}

const detectLanguage = (path: string | null) => {
  if (!path) {
    return "plaintext";
  }

  const normalizedPath = path.toLowerCase();
  const filename = normalizedPath.split("/").pop() ?? "";
  if (filename === "dockerfile") {
    return "dockerfile";
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "py":
    case "pyw":
    case "pyi":
      return "python";
    case "vue":
      return "html";
    case "md":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "css":
      return "css";
    case "html":
      return "html";
    case "xml":
      return "xml";
    case "sql":
      return "sql";
    case "sh":
    case "bash":
    case "zsh":
    case "ps1":
      return "shell";
    default:
      return "plaintext";
  }
};

export function WorkspaceCodeEditor({
  loading,
  error,
  activeFilePath,
  compareMode,
  draftFiles,
  originalFiles,
  onContentChange,
}: WorkspaceCodeEditorProps) {
  const diffSubscriptionRef = useRef<{ dispose: () => void } | null>(null);
  const activeFilePathRef = useRef<string | null>(null);

  useEffect(() => {
    activeFilePathRef.current = activeFilePath;
  }, [activeFilePath]);

  const activeLanguage = detectLanguage(activeFilePath);
  const activeDraft = activeFilePath ? (draftFiles[activeFilePath] ?? "") : "";
  const activeOriginal = activeFilePath
    ? (originalFiles[activeFilePath] ?? "")
    : "";

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFilePath) {
      return;
    }

    onContentChange(activeFilePath, value ?? "");
  };

  const handleDiffMount = useCallback(
    (editor: MonacoDiffEditor) => {
      diffSubscriptionRef.current?.dispose();
      const modifiedEditor = editor.getModifiedEditor();
      diffSubscriptionRef.current = modifiedEditor.onDidChangeModelContent(
        () => {
          const currentPath = activeFilePathRef.current;
          if (!currentPath) {
            return;
          }

          onContentChange(currentPath, modifiedEditor.getValue());
        },
      );
    },
    [onContentChange],
  );

  useEffect(() => {
    if (!compareMode) {
      diffSubscriptionRef.current?.dispose();
      diffSubscriptionRef.current = null;
    }
  }, [compareMode]);

  useEffect(() => {
    return () => {
      diffSubscriptionRef.current?.dispose();
      diffSubscriptionRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-0 min-w-0 flex-1">
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          工作空间加载中...
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center px-6 text-sm text-destructive">
          {error}
        </div>
      ) : !activeFilePath ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          工作空间内没有有效文件
        </div>
      ) : compareMode ? (
        <DiffEditor
          height="100%"
          original={activeOriginal}
          modified={activeDraft}
          language={activeLanguage}
          onMount={handleDiffMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            originalEditable: false,
            readOnly: false,
            renderSideBySide: true,
            wordWrap: "off",
            scrollBeyondLastColumn: 5,
          }}
        />
      ) : (
        <Editor
          height="100%"
          width="100%"
          path={activeFilePath}
          value={activeDraft}
          language={activeLanguage}
          onChange={handleEditorChange}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: "off",
            scrollBeyondLastColumn: 5,
          }}
        />
      )}
    </div>
  );
}
