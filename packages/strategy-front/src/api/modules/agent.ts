import { request } from "@/api/client";
import { opencode } from "@/api/opencode";
import type {
  AgentBody,
  AgentChange,
  GlobalAgentCatalog,
  RuntimeAgent,
} from "@/types/agent";

export const agentApi = {
  listRuntime(workspacePath: string) {
    return opencode.get<RuntimeAgent[]>("/agent", {
      params: {
        directory: workspacePath,
      },
    });
  },

  list(workspacePath: string) {
    return opencode.get<RuntimeAgent[]>("/agent", {
      params: {
        directory: workspacePath,
      },
    });
  },

  listGlobal() {
    return request.get<GlobalAgentCatalog>("/opencode/agents");
  },

  createGlobal(body: AgentBody) {
    return request.post<AgentChange, AgentBody>("/opencode/agents", body);
  },

  updateGlobal(name: string, body: Pick<AgentBody, "content">) {
    return request.put<AgentChange, Pick<AgentBody, "content">>(
      `/opencode/agents/${encodeURIComponent(name)}`,
      body,
    );
  },

  removeGlobal(name: string) {
    return request.delete<AgentChange>(`/opencode/agents/${encodeURIComponent(name)}`);
  },
};
