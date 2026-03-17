import type { ChatModelRef } from "@/types/chat";

export interface Agent {
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

export interface ComposerState {
  agent?: string;
  model?: ChatModelRef;
  variant?: string | null;
}
