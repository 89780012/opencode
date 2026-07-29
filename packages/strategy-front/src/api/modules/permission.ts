import { opencode } from "@/api/opencode";
import type { PermissionRequest } from "@/types/chat";

export const permissionApi = {
  list(workspacePath: string) {
    return opencode.get<PermissionRequest[]>("/permission", {
      params: { directory: workspacePath },
    });
  },

  respond(workspacePath: string, requestID: string, body: { reply: "once" | "always" | "reject" }) {
    return opencode.post<boolean, { reply: "once" | "always" | "reject" }>(
      `/permission/${encodeURIComponent(requestID)}/reply`,
      body,
      { params: { directory: workspacePath } },
    );
  },
};
