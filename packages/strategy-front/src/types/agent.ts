import type { ChatModelRef } from "@/types/chat";

export interface RuntimeAgent {
  name: string;
  description?: string;
  mode: "subagent" | "primary" | "all";
  native?: boolean;
  hidden?: boolean;
  model?: ChatModelRef;
  variant?: string;
  color?: string;
  steps?: number;
  options: Record<string, unknown>;
}

export interface GlobalAgent {
  name: string;
  description?: string;
  mode: "subagent" | "primary" | "all";
  model?: string;
  color?: string;
  hidden?: boolean;
  steps?: number;
  path: string;
  content: string;
  updated_at: string;
}

export interface GlobalAgentCatalog {
  root: string;
  agents: GlobalAgent[];
}

export interface AgentChange {
  agent?: GlobalAgent;
  name?: string;
  reload_required: boolean;
}

export interface AgentBody {
  name: string;
  content: string;
}

export type Agent = RuntimeAgent;

export interface ComposerState {
  agent?: string;
  model?: ChatModelRef;
  variant?: string | null;
}
