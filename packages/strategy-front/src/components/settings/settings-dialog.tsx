"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppSettings } from "./app-settings";
import { MCPSettings } from "./mcp-settings";
import { ModelSettings } from "./model-settings";
import { settingsApi } from "@/api/modules/settings";
import type {
  AgentConfigFormValues,
  LLMConfigFormValues,
  MCPConfigFormValues,
} from "@/types/settings";
import {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_LLM_CONFIG,
  DEFAULT_MCP_CONFIG,
  navItems,
} from "@/consts/settings";
import { toast } from "sonner";

type NavKey = (typeof navItems)[number]["key"];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeNav, setActiveNav] = useState<NavKey>("agent");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [llmConfigValues, setLlmConfigValues] =
    useState<LLMConfigFormValues>(DEFAULT_LLM_CONFIG);
  const [agentConfigValues, setAgentConfigValues] =
    useState<AgentConfigFormValues>(DEFAULT_AGENT_CONFIG);
  const [mcpConfigValues, setMcpConfigValues] =
    useState<MCPConfigFormValues>(DEFAULT_MCP_CONFIG);

  useEffect(() => {
    if (!open) return;

    const loadSettings = async () => {
      setLoading(true);
      setActiveNav("agent");

      try {
        const [agentConfig, llmConfig, mcpConfig] = await Promise.all([
          settingsApi.getAgentConfig(),
          settingsApi.getLlmConfig(),
          settingsApi.getMcpServers(),
        ]);

        setAgentConfigValues({ ...DEFAULT_AGENT_CONFIG, ...agentConfig });
        setLlmConfigValues({
          ...DEFAULT_LLM_CONFIG,
          ...llmConfig,
          api_key: "",
        });
        setMcpConfigValues({
          ...DEFAULT_MCP_CONFIG,
          ...mcpConfig,
          mcpServers: mcpConfig.mcpServers ?? {},
        });
      } catch (e) {
        console.error("failed to load settings", e);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [open]);

  const handleSave = async () => {
    if (activeNav === "mcp") {
      return;
    }

    setSaving(true);
    try {
      if (activeNav === "agent") {
        const latest = await settingsApi.saveAgentConfig(agentConfigValues);
        setAgentConfigValues((prev) => ({ ...prev, ...latest }));
      } else if (activeNav === "model") {
        const latest = await settingsApi.saveLlmConfig(llmConfigValues);
        setLlmConfigValues((prev) => ({ ...prev, ...latest, api_key: "" }));
      }

      toast.success("配置保存成功");
    } catch (e) {
      console.error("failed to save settings", e);
      toast.error("配置保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-187.5 h-130 p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">设置</DialogTitle>
        <div className="flex h-full">
          {/* 左侧导航 */}
          <nav className="w-45 border-r bg-muted/30 p-3 flex flex-col gap-1">
            <h2 className="px-3 py-2 text-sm font-semibold text-foreground">
              设置
            </h2>
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeNav === item.key &&
                    "bg-accent text-accent-foreground font-medium",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* 右侧内容 */}
          <div className="flex flex-1 flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {activeNav === "agent" && (
                  <AppSettings
                    values={agentConfigValues}
                    onChange={(field, value) =>
                      setAgentConfigValues((prev) => ({
                        ...prev,
                        [field]: value,
                      }))
                    }
                  />
                )}
                {activeNav === "model" && (
                  <ModelSettings
                    values={llmConfigValues}
                    onChange={(field, value) =>
                      setLlmConfigValues((prev) => ({
                        ...prev,
                        [field]: value,
                      }))
                    }
                  />
                )}
                {activeNav === "mcp" && (
                  <MCPSettings
                    values={mcpConfigValues}
                    onChange={setMcpConfigValues}
                    loading={loading}
                  />
                )}
              </div>
            </ScrollArea>

            {/* 底部按钮 */}
            <div className="flex justify-end gap-2 border-t px-6 py-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              {activeNav !== "mcp" && (
                <Button onClick={handleSave} disabled={saving || loading}>
                  {loading ? "加载中..." : saving ? "保存中..." : "保存"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
