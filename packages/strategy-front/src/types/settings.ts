export interface LLMConfigFormValues {
  base_url: string;
  api_key: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export interface AgentConfigFormValues {
  max_iterations: number;
  max_retries: number;
  max_search_results: number;
}

export type MCPTransport = "stdio" | "sse" | "streamable_http";

export interface MCPServerConfigFormValues {
  transport: MCPTransport;
  enabled: boolean;
  description?: string;
  env?: Record<string, unknown>;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MCPConfigFormValues {
  mcpServers: Record<string, MCPServerConfigFormValues>;
}
