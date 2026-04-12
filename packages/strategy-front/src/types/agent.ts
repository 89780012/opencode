import type { ChatModelRef } from "@/types/chat";

export type WorkflowAgentRole = "router" | "responder" | "planner" | "executor" | "checker";

export interface RuntimeAgent {
  name: string;
  description?: string;
  scope?: string;
  mode: "subagent" | "primary" | "all";
  native?: boolean;
  hidden?: boolean;
  model?: ChatModelRef;
  variant?: string;
  color?: string;
  steps?: number;
  workflow_role?: WorkflowAgentRole;
  options: Record<string, unknown>;
}

export interface GlobalAgent {
  name: string;
  description?: string;
  scope?: string;
  mode: "subagent" | "primary" | "all";
  model?: string;
  color?: string;
  hidden?: boolean;
  steps?: number;
  workflow_role?: WorkflowAgentRole;
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
