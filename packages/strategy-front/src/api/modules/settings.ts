import { request } from "@/api/client";
import type {
  AgentConfigFormValues,
  LLMConfigFormValues,
  MCPConfigFormValues,
} from "@/types/settings";

export const settingsApi = {
  getAgentConfig() {
    return request.get<AgentConfigFormValues>("/settings/agent-config");
  },

  getLlmConfig() {
    return request.get<LLMConfigFormValues>("/settings/llm-config");
  },

  saveAgentConfig(data: AgentConfigFormValues) {
    return request.post<AgentConfigFormValues, AgentConfigFormValues>(
      "/settings/agent-config",
      data,
    );
  },

  saveLlmConfig(data: LLMConfigFormValues) {
    return request.post<LLMConfigFormValues, LLMConfigFormValues>(
      "/settings/llm-config",
      data,
    );
  },

  getMcpServers() {
    return request.get<MCPConfigFormValues>("/settings/mcp-servers");
  },

  saveMcpServers(data: MCPConfigFormValues) {
    return request.post<MCPConfigFormValues, MCPConfigFormValues>(
      "/settings/mcp-servers",
      data,
    );
  },

  setMcpServerEnabled(serverName: string, enabled: boolean) {
    return request.post<MCPConfigFormValues>(
      `/settings/mcp-servers/${encodeURIComponent(serverName)}/enabled?enabled=${enabled}`,
    );
  },

  deleteMcpServer(serverName: string) {
    return request.post<MCPConfigFormValues>(
      `/settings/mcp-servers/${encodeURIComponent(serverName)}/delete`,
    );
  },
};
