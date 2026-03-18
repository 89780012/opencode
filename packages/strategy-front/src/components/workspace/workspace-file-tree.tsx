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

interface Props {
  filePaths: string[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
}

interface Node {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  children?: Node[];
}

const icon = (name: string): { Icon: LucideIcon; className: string } => {
  const file = name.toLowerCase();
  const ext = file.split(".").pop() ?? "";

  if (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "package-lock.json" ||
    file === "yarn.lock"
  ) {
    return { Icon: Package, className: "text-amber-500" };
  }
  if (file === "dockerfile" || ext === "dockerignore") {
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
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) {
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

const tree = (filePaths: string[]) => {
  const root: Node[] = [];
  const map = new Map<string, Node>();

  for (const filePath of filePaths) {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length === 0) {
      continue;
    }

    let nodes = root;
    let dir = "";

    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      dir = dir ? `${dir}/${part}` : part;

      let item = map.get(dir);
      if (!item) {
        item = {
          id: `folder:${dir}`,
          name: part,
          path: dir,
          type: "folder",
          children: [],
        };
        map.set(dir, item);
        nodes.push(item);
      }

      if (!item.children) {
        item.children = [];
      }
      nodes = item.children;
    }

    nodes.push({
      id: `file:${filePath}`,
      name: parts[parts.length - 1],
      path: filePath,
      type: "file",
    });
  }

  const sort = (nodes: Node[]) => {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "folder" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

    nodes.forEach((item) => {
      if (item.children?.length) {
        sort(item.children);
      }
    });
  };

  sort(root);
  return root;
};

export function WorkspaceFileTree(props: Props) {
  const [height, setHeight] = useState(320);
  const ref = useRef<HTMLDivElement | null>(null);
  const data = useMemo(() => tree([...props.filePaths].sort()), [props.filePaths]);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const sync = () => {
      setHeight(Math.max(node.clientHeight, 240));
    };
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <aside ref={ref} className="h-full w-[280px] shrink-0 border-r bg-muted/10">
      <Tree<Node>
        data={data}
        width="100%"
        height={height}
        rowHeight={32}
        indent={18}
        openByDefault={false}
        disableDrag
        disableDrop
        disableEdit
      >
        {({ node, style }: NodeRendererProps<Node>) => {
          const file = node.data.type === "file";
          const active = file && props.activeFilePath === node.data.path;
          const meta = file ? icon(node.data.name) : null;
          const Icon = meta?.Icon;

          return (
            <div style={style} className="px-1">
              <button
                type="button"
                onClick={() => {
                  if (file) {
                    props.onSelectFile(node.data.path);
                    return;
                  }
                  node.toggle();
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded px-2 text-sm transition-colors",
                  active ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 hover:text-foreground",
                )}
                style={{
                  paddingLeft: `${8 + node.level * 16}px`,
                }}
              >
                {file ? (
                  <>
                    <span className="w-3.5 shrink-0" />
                    {Icon ? <Icon className={cn("size-3.5 shrink-0", meta?.className)} /> : null}
                  </>
                ) : (
                  <>
                    {node.isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    <Folder className="size-3.5 shrink-0 text-sky-500" />
                  </>
                )}
                <span className="truncate" title={node.data.path}>
                  {node.data.name}
                </span>
              </button>
            </div>
          );
        }}
      </Tree>
    </aside>
  );
}
