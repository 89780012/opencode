import { opencode } from "@/api/opencode"
import type { ProjectInfo } from "@/types/project"

export const projectApi = {
  current(workspacePath: string) {
    return opencode.get<ProjectInfo>("/project/current", {
      params: {
        directory: workspacePath,
      },
    })
  },

  initGit(workspacePath: string) {
    return opencode.post<ProjectInfo>("/project/git/init", undefined, {
      params: {
        directory: workspacePath,
      },
    })
  },
}
