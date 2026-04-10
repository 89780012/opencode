import { request } from "@/api/client"
import type {
  WorkflowReply,
  WorkflowRun,
  WorkflowStartResult,
  WorkflowSummary,
  WorkflowUpsertInput,
  WorkflowRuntimeDetail,
  WorkflowRuntimeList,
  WorkflowRunList,
  WorkflowNodeRunList,
  WorkflowWaitList,
} from "@/types/workflow"

export const workflowApi = {
  list() {
    return request.get<WorkflowRuntimeList>("/workflow")
  },

  get(id: string) {
    return request.get<WorkflowRuntimeDetail>(`/workflow/${encodeURIComponent(id)}`)
  },

  summary(id: string) {
    return request.get<WorkflowSummary>(`/workflow/${encodeURIComponent(id)}/summary`)
  },

  save(body: WorkflowUpsertInput) {
    return request.post<WorkflowRuntimeDetail, WorkflowUpsertInput>("/workflow", body)
  },

  update(id: string, body: WorkflowUpsertInput) {
    return request.put<WorkflowRuntimeDetail, WorkflowUpsertInput>(`/workflow/${encodeURIComponent(id)}`, body)
  },

  remove(id: string) {
    return request.delete<void>(`/workflow/${encodeURIComponent(id)}`)
  },

  start(id: string, workspace_path: string, input: string) {
    return request.post<WorkflowStartResult, { workspace_path: string; input: string }>(
      `/workflow/${encodeURIComponent(id)}/start`,
      {
        workspace_path,
        input,
      },
    )
  },

  runs(workflowID?: string) {
    return request.get<WorkflowRunList>("/workflow-runs", {
      params: workflowID ? { workflow_id: workflowID } : undefined,
    })
  },

  run(id: string) {
    return request.get<WorkflowRun>(`/workflow-runs/${encodeURIComponent(id)}`)
  },

  nodeRuns(id: string) {
    return request.get<WorkflowNodeRunList>(`/workflow-runs/${encodeURIComponent(id)}/nodes`)
  },

  waits(id: string) {
    return request.get<WorkflowWaitList>(`/workflow-runs/${encodeURIComponent(id)}/waits`)
  },

  reply(id: string, body: { wait_id: string; payload?: unknown; idempotency_key: string }) {
    return request.post<WorkflowReply, { wait_id: string; payload?: unknown; idempotency_key: string }>(
      `/workflow-runs/${encodeURIComponent(id)}/replies`,
      body,
    )
  },
}
