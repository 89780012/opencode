import { Navigate, useParams } from "react-router-dom"
import { WorkflowShell } from "@/components/workflow/workflow-shell"
import { getWorkflow } from "@/data/workflow-demo"

export default function WorkflowDetailPage() {
  const params = useParams()
  const item = params.workflowID ? getWorkflow(params.workflowID) : null

  if (!item) {
    return <Navigate to="/app/workflows" replace />
  }

  return <WorkflowShell item={item} />
}
