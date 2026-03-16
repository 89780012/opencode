import { useEffect, useMemo, useRef, useState } from "react";
import { Tree, type NodeRendererProps } from "react-arborist";
import {
  ChevronDown,
  ChevronRight,
  FileArchive,
  FileCode,
  FileCog,
  FileImage,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FileType,
  Folder,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceFileTreeProps {
  filePaths: string[];
  draftFiles: Record<string, string>;
  originalFiles: Record<string, string>;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
}

interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  changed?: boolean;
  children?: FileTreeNode[];
}

const getFileIconMeta = (
  fileName: string,
): { Icon: LucideIcon; className: string } => {
  const normalized = fileName.toLowerCase();
  const ext = normalized.split(".").pop() ?? "";

  if (
    normalized === "package.json" ||
    normalized === "pnpm-lock.yaml" ||
    normalized === "package-lock.json" ||
    normalized === "yarn.lock"
  ) {
    return { Icon: Package, className: "text-amber-500" };
  }

  if (normalized === "dockerfile" || ext === "dockerignore") {
    return { Icon: FileArchive, className: "text-sky-500" };
  }

  if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "vue"].includes(ext)) {
    return { Icon: FileCode, className: "text-blue-500" };
  }

  if (["py", "pyw", "pyi"].includes(ext)) {
    return { Icon: FileTerminal, className: "text-yellow-500" };
  }

  if (["json", "jsonc"].includes(ext)) {
    return { Icon: FileType, className: "text-emerald-500" };
  }

  if (["yml", "yaml", "toml", "ini", "env"].includes(ext)) {
    return { Icon: FileCog, className: "text-violet-500" };
  }

  if (["md", "mdx", "txt"].includes(ext)) {
    return { Icon: FileText, className: "text-zinc-500" };
  }

  if (["csv", "tsv", "xls", "xlsx"].includes(ext)) {
    return { Icon: FileSpreadsheet, className: "text-green-600" };
  }

  if (
    ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(ext)
  ) {
    return { Icon: FileImage, className: "text-pink-500" };
  }

  if (["zip", "gz", "rar", "7z", "tar"].includes(ext)) {
    return { Icon: FileArchive, className: "text-orange-500" };
  }

  if (["sh", "bash", "zsh", "ps1"].includes(ext)) {
    return { Icon: FileTerminal, className: "text-lime-600" };
  }

  return { Icon: FileText, className: "text-muted-foreground" };
};

const buildFileTree = (
  filePaths: string[],
  draftFiles: Record<string, string>,
  originalFiles: Record<string, string>,
) => {
  const root: FileTreeNode[] = [];
  const folderMap = new Map<string, FileTreeNode>();

  for (const filePath of filePaths) {
    const segments = filePath.split("/").filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let currentNodes = root;
    let folderPath = "";

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      folderPath = folderPath ? `${folderPath}/${segment}` : segment;

      let folderNode = folderMap.get(folderPath);
      if (!folderNode) {
        folderNode = {
          id: `folder:${folderPath}`,
          name: segment,
          path: folderPath,
          type: "folder",
          children: [],
        };
        folderMap.set(folderPath, folderNode);
        currentNodes.push(folderNode);
      }

      if (!folderNode.children) {
        folderNode.children = [];
      }
      currentNodes = folderNode.children;
    }

    const fileName = segments[segments.length - 1];
    const originalContent = originalFiles[filePath] ?? "";
    const hasDraft = Object.prototype.hasOwnProperty.call(draftFiles, filePath);
    const draftContent = hasDraft ? (draftFiles[filePath] ?? "") : originalContent;
    currentNodes.push({
      id: `file:${filePath}`,
      name: fileName,
      path: filePath,
      type: "file",
      changed: draftContent !== originalContent,
    });
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "folder" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

    nodes.forEach((node) => {
      if (node.children?.length) {
        sortNodes(node.children);
      }
    });
  };

  const markFolderChanges = (nodes: FileTreeNode[]) => {
    let hasChanged = false;

    nodes.forEach((node) => {
      let nodeChanged = Boolean(node.changed);
      if (node.children?.length) {
        nodeChanged = markFolderChanges(node.children) || nodeChanged;
      }
      node.changed = nodeChanged;
      hasChanged = hasChanged || nodeChanged;
    });

    return hasChanged;
  };

  sortNodes(root);
  markFolderChanges(root);
  return root;
};

export function WorkspaceFileTree({
  filePaths,
  draftFiles,
  originalFiles,
  activeFilePath,
  onSelectFile,
}: WorkspaceFileTreeProps) {
  const [treeHeight, setTreeHeight] = useState(320);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  const sortedPaths = useMemo(() => [...filePaths].sort(), [filePaths]);
  const fileTree = useMemo(
    () => buildFileTree(sortedPaths, draftFiles, originalFiles),
    [draftFiles, originalFiles, sortedPaths],
  );

  useEffect(() => {
    const container = treeContainerRef.current;
    if (!container) {
      return;
    }

    const updateTreeHeight = () => {
      setTreeHeight(Math.max(container.clientHeight, 240));
    };
    updateTreeHeight();

    const resizeObserver = new ResizeObserver(updateTreeHeight);
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <aside
      ref={treeContainerRef}
      className="w-[280px] h-full shrink-0 border-r bg-muted/10"
    >
      <Tree<FileTreeNode>
        data={fileTree}
        width="100%"
        height={treeHeight}
        rowHeight={32}
        indent={18}
        openByDefault={false}
        disableDrag
        disableDrop
        disableEdit
      >
        {({ node, style }: NodeRendererProps<FileTreeNode>) => {
          const isFile = node.data.type === "file";
          const isActive = isFile && activeFilePath === node.data.path;
          const fileIconMeta = isFile ? getFileIconMeta(node.data.name) : null;
          const FileIcon = fileIconMeta?.Icon;

          return (
            <div style={style} className="px-1">
              <button
                type="button"
                onClick={() => {
                  if (isFile) {
                    onSelectFile(node.data.path);
                    return;
                  }
                  node.toggle();
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded px-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-foreground"
                    : "hover:bg-muted/60 hover:text-foreground",
                )}
                style={{
                  paddingLeft: `${8 + node.level * 16}px`,
                }}
              >
                {node.data.type === "folder" ? (
                  <>
                    {node.isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    <Folder className="size-3.5 shrink-0 text-sky-500" />
                  </>
                ) : (
                  <>
                    <span className="w-3.5 shrink-0" />
                    {FileIcon ? (
                      <FileIcon
                        className={cn(
                          "size-3.5 shrink-0",
                          fileIconMeta?.className,
                        )}
                      />
                    ) : null}
                  </>
                )}
                <span className="truncate" title={node.data.path}>
                  {node.data.name}
                </span>
                {node.data.changed ? (
                  <span className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-500" />
                ) : null}
              </button>
            </div>
          );
        }}
      </Tree>
    </aside>
  );
}
