import { opencode } from "@/api/opencode";
import type { PermissionRequest } from "@/types/chat";

export const permissionApi = {
  list() {
    return opencode.get<PermissionRequest[]>("/permission");
  },

  respond(requestID: string, body: { reply: "once" | "always" | "reject" }) {
    return opencode.post<boolean, { reply: "once" | "always" | "reject" }>(
      `/permission/${encodeURIComponent(requestID)}/reply`,
      body,
    );
  },
};
