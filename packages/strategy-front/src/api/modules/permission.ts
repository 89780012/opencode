import { opencode } from "@/api/opencode";
import type { PermissionRequest } from "@/types/chat";

export const permissionApi = {
  list() {
    return opencode.get<PermissionRequest[]>("/permission");
  },

  respond(
    sessionID: string,
    permissionID: string,
    body: { response: "once" | "always" | "reject" },
  ) {
    return opencode.post<boolean, { response: "once" | "always" | "reject" }>(
      `/session/${encodeURIComponent(sessionID)}/permissions/${encodeURIComponent(permissionID)}`,
      body,
    );
  },
};
