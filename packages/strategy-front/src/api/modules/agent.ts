import { opencode } from "@/api/opencode";
import type { Agent } from "@/types/agent";

export const agentApi = {
  list(workspacePath: string) {
    return opencode.get<Agent[]>("/agent", {
      params: {
        directory: workspacePath,
      },
    });
  },
};
