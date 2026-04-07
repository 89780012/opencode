import { useEffect, useState } from "react"
import { Navigate, useParams } from "react-router-dom"
import { WorkflowShell } from "@/components/workflow/workflow-shell"
import { workflowApi } from "@/api/modules"
import type { WorkflowRuntimeDetail } from "@/types/workflow"

export default function WorkflowDetailPage() {
  const params = useParams()
  const [item, setItem] = useState<WorkflowRuntimeDetail | null>(null)
  const [load, setLoad] = useState(true)

  useEffect(() => {
    if (!params.workflowID) return
    setLoad(true)
    workflowApi
      .get(params.workflowID)
      .then(setItem)
      .finally(() => setLoad(false))
  }, [params.workflowID])

  if (!params.workflowID) {
    return <Navigate to="/app/workflows" replace />
  }

  if (load) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading workflow...</div>
  }

  if (!item) {
    return <Navigate to="/app/workflows" replace />
  }

  return (
    <WorkflowShell
      item={item}
      onRefresh={async () => {
        setItem(await workflowApi.get(params.workflowID!))
      }}
    />
  )
}
