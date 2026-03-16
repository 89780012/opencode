import type {
  AgentConfigFormValues,
  LLMConfigFormValues,
  MCPConfigFormValues,
} from "@/types/settings";
import { Bot, ServerCog, Settings } from "lucide-react";

export const DEFAULT_LLM_CONFIG: LLMConfigFormValues = {
  base_url: "https://api.deepseek.com/v1",
  api_key: "",
  model_name: "deepseek-chat",
  temperature: 0.7,
  max_tokens: 8192,
};

export const DEFAULT_AGENT_CONFIG: AgentConfigFormValues = {
  max_iterations: 100,
  max_retries: 3,
  max_search_results: 10,
};

export const DEFAULT_MCP_CONFIG: MCPConfigFormValues = {
  mcpServers: {},
};

export const navItems = [
  { key: "agent", label: "Agent配置", icon: Settings },
  { key: "model", label: "模型配置", icon: Bot },
  { key: "mcp", label: "MCP服务", icon: ServerCog },
] as const;
