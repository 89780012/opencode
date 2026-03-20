import { opencode } from "@/api/opencode";
import type { PermissionRequest } from "@/types/chat";

export const permissionApi = {
  list(directory: string) {
    return opencode.get<PermissionRequest[]>("/permission", {
      params: {
        directory,
      },
    });
  },

  respond(
    directory: string,
    requestID: string,
    body: { reply: "once" | "always" | "reject" },
  ) {
    return opencode.post<boolean, { reply: "once" | "always" | "reject" }>(
      `/permission/${encodeURIComponent(requestID)}/reply`,
      body,
      {
        params: {
          directory,
        },
      },
    );
  },
};
