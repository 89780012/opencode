import { request } from "@/api/client";
import type { InstallTask, ToolID, ToolState } from "@/types/system";

export const systemApi = {
  list() {
    return request.get<ToolState[]>("/system/tools");
  },

  install(id: ToolID) {
    return request.post<InstallTask>(`/system/tools/${encodeURIComponent(id)}/install`);
  },

  task(id: string) {
    return request.get<InstallTask>(`/system/tasks/${encodeURIComponent(id)}`);
  },
};
