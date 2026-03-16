"use client";

import { useMemo, useState } from "react";
import { settingsApi } from "@/api/modules/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  MCPConfigFormValues,
  MCPServerConfigFormValues,
  MCPTransport,
} from "@/types/settings";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MCP_IMPORT_TEMPLATE = `// 示例 JSON（stdio）:
// {
//   "mcpServers": {
//     "stdio-server-example": {
//       "transport": "stdio",
//       "command": "npx",
//       "args": ["-y", "mcp-server-example"]
//     }
//   }
// }
//
// 示例 JSON（sse）:
// {
//   "mcpServers": {
//     "sse-server-example": {
//       "transport": "sse",
//       "url": "http://localhost:3000"
//     }
//   }
// }
//
// 示例 JSON（streamable_http）:
// {
//   "mcpServers": {
//     "streamable-http-example": {
//       "transport": "streamable_http",
//       "url": "http://localhost:3001",
//       "headers": {
//         "Content-Type": "application/json",
//         "Authorization": "Bearer your-token"
//       }
//     }
//   }
// }`;

interface MCPSettingsProps {
  values: MCPConfigFormValues;
  onChange: (values: MCPConfigFormValues) => void;
  loading?: boolean;
}

const stripJsonComments = (input: string): string => {
  const withoutBlock = input.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock
    .split("\n")
    .map((line) => line.replace(/^\s*\/\/.*$/g, ""))
    .join("\n");
};

const normalizeTransport = (value: unknown): MCPTransport => {
  if (typeof value !== "string") {
    return "streamable_http";
  }

  const lowered = value.toLowerCase();
  if (lowered === "stdio") {
    return "stdio";
  }
  if (lowered === "sse") {
    return "sse";
  }
  if (lowered === "streamablehttp" || lowered === "streamable_http") {
    return "streamable_http";
  }

  return "streamable_http";
};

const normalizeServer = (
  raw: Record<string, unknown>,
): MCPServerConfigFormValues => {
  const normalized = { ...raw } as MCPServerConfigFormValues;
  normalized.transport = normalizeTransport(raw.transport ?? raw.type);
  normalized.enabled =
    typeof raw.enabled === "boolean"
      ? raw.enabled
      : (normalized.enabled ?? true);

  if (
    normalized.transport === "stdio" &&
    typeof normalized.command !== "string"
  ) {
    throw new Error("stdio 模式必须配置 command");
  }
  if (normalized.transport !== "stdio" && typeof normalized.url !== "string") {
    throw new Error("sse 或 streamable_http 模式必须配置 url");
  }

  delete normalized.type;
  return normalized;
};

const normalizeMcpConfig = (raw: unknown): MCPConfigFormValues => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON 必须是对象");
  }

  const record = raw as Record<string, unknown>;
  const source =
    record.mcpServers && typeof record.mcpServers === "object"
      ? (record.mcpServers as Record<string, unknown>)
      : record;
  const mcpServers: Record<string, MCPServerConfigFormValues> = {};

  for (const [serverName, serverValue] of Object.entries(source)) {
    if (!serverName.trim()) {
      throw new Error("服务名不能为空");
    }
    if (
      !serverValue ||
      typeof serverValue !== "object" ||
      Array.isArray(serverValue)
    ) {
      throw new Error(`服务 ${serverName} 的配置格式无效`);
    }
    mcpServers[serverName] = normalizeServer(
      serverValue as Record<string, unknown>,
    );
  }

  return { mcpServers };
};

const parseImportText = (text: string): MCPConfigFormValues => {
  const cleaned = stripJsonComments(text).trim();
  if (!cleaned) {
    return { mcpServers: {} };
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return normalizeMcpConfig(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON 解析失败";
    throw new Error(`JSON 解析失败: ${message}`);
  }
};

const getServerSubtitle = (server: MCPServerConfigFormValues): string => {
  if (typeof server.description === "string" && server.description.trim()) {
    return server.description;
  }
  if (typeof server.command === "string" && server.command.trim()) {
    return `command: ${server.command}`;
  }
  if (typeof server.url === "string" && server.url.trim()) {
    return server.url;
  }

  return "MCP server";
};

export function MCPSettings({
  values,
  onChange,
  loading = false,
}: MCPSettingsProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorText, setEditorText] = useState(MCP_IMPORT_TEMPLATE);
  const [savingEditor, setSavingEditor] = useState(false);
  const [actingServer, setActingServer] = useState<string | null>(null);
  const [deletingServer, setDeletingServer] = useState<string | null>(null);

  const serverEntries = useMemo(
    () => Object.entries(values.mcpServers ?? {}),
    [values.mcpServers],
  );

  const openAddDialog = () => {
    setEditorText("");
    setEditorOpen(true);
  };

  const openEditAllDialog = () => {
    setEditorText(JSON.stringify(values, null, 2));
    setEditorOpen(true);
  };

  const openEditServerDialog = (
    serverName: string,
    serverConfig: MCPServerConfigFormValues,
  ) => {
    setEditorText(
      JSON.stringify(
        {
          mcpServers: {
            [serverName]: serverConfig,
          },
        },
        null,
        2,
      ),
    );
    setEditorOpen(true);
  };

  const handleSaveFromEditor = async () => {
    setSavingEditor(true);
    try {
      const payload = parseImportText(editorText);
      const latest = await settingsApi.saveMcpServers(payload);
      onChange(latest);
      toast.success("MCP 配置更新成功");
      setEditorOpen(false);
    } catch (error) {
      console.error("failed to save mcp settings", error);
      const message = error instanceof Error ? error.message : "保存失败";
      toast.error(message);
    } finally {
      setSavingEditor(false);
    }
  };

  const handleToggleServer = async (serverName: string, enabled: boolean) => {
    setActingServer(serverName);
    try {
      const latest = await settingsApi.setMcpServerEnabled(serverName, enabled);
      onChange(latest);
      toast.success(`${serverName} 已${enabled ? "启用" : "停用"}`);
    } catch (error) {
      console.error("failed to set mcp server enabled", error);
      toast.error("更新服务状态失败");
    } finally {
      setActingServer(null);
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    if (!window.confirm(`确认删除 MCP 服务 ${serverName} ?`)) {
      return;
    }

    setDeletingServer(serverName);
    try {
      const latest = await settingsApi.deleteMcpServer(serverName);
      onChange(latest);
      toast.success("服务已删除");
    } catch (error) {
      console.error("failed to delete mcp server", error);
      toast.error("删除服务失败");
    } finally {
      setDeletingServer(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">MCP 服务器</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditAllDialog}>
            <Pencil className="size-4" />
            编辑
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="size-4" />
            添加
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {serverEntries.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            暂无 MCP 服务，请点击“添加”导入配置。
          </div>
        )}

        {serverEntries.map(([serverName, serverConfig]) => {
          const pending =
            actingServer === serverName || deletingServer === serverName;
          return (
            <div
              key={serverName}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                serverConfig.enabled
                  ? "border-emerald-500/60 bg-emerald-500/5"
                  : "border-border bg-background",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-3">
                  <div className="space-y-1">
                    <p className="truncate text-lg font-semibold">
                      {serverName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getServerSubtitle(serverConfig)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {serverConfig.transport}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {serverConfig.enabled ? "已启用" : "已停用"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={serverConfig.enabled}
                    onCheckedChange={(checked) =>
                      void handleToggleServer(serverName, checked)
                    }
                    disabled={pending || loading}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      openEditServerDialog(serverName, serverConfig)
                    }
                    disabled={pending || loading}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void handleDeleteServer(serverName)}
                    className="text-destructive hover:text-destructive"
                    disabled={pending || loading}
                  >
                    {deletingServer === serverName ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>从 JSON 导入</DialogTitle>
            <DialogDescription>
              请粘贴 MCP Servers 配置 JSON（支持 // 注释行）。
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] rounded-md border bg-muted/30">
            <textarea
              className="h-[60vh] w-full resize-none bg-transparent p-3 font-mono text-xs leading-6 outline-none"
              value={editorText}
              placeholder={MCP_IMPORT_TEMPLATE}
              onChange={(event) => setEditorText(event.target.value)}
            />
          </ScrollArea>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={savingEditor}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleSaveFromEditor()}
              disabled={savingEditor}
            >
              {savingEditor ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "确定"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
