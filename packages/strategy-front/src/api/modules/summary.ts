import { request } from "@/api/client"
import type { SessionSummary, SessionSummaryRequest } from "@/types/summary"

export const summaryApi = {
  get(workspacePath: string, sessionId: string) {
    return request.get<SessionSummary>("/summary/session", {
      params: {
        workspacePath,
        sessionId,
      },
    })
  },

  run(body: SessionSummaryRequest) {
    return request.post<SessionSummary, SessionSummaryRequest>("/summary/session", body)
  },
  stop(workspacePath: string, sessionId: string) {
    return request.post<SessionSummary, null>("/summary/session/stop", null, {
      params: {
        workspacePath,
        sessionId,
      },
    })
  },
}
