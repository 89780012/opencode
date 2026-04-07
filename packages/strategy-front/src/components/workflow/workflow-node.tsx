import { WorkflowBuildNode } from "./workflow-node-build"
import { WorkflowEndNode } from "./workflow-node-end"
import { WorkflowGateNode } from "./workflow-node-gate"
import { WorkflowJudgeNode } from "./workflow-node-judge"
import { WorkflowPlanNode } from "./workflow-node-plan"
import { WorkflowReviewNode } from "./workflow-node-review"
import { WorkflowStartNode } from "./workflow-node-start"

export const workflowNodeTypes = {
  "workflow-build": WorkflowBuildNode,
  "workflow-end": WorkflowEndNode,
  "workflow-gate": WorkflowGateNode,
  "workflow-judge": WorkflowJudgeNode,
  "workflow-plan": WorkflowPlanNode,
  "workflow-review": WorkflowReviewNode,
  "workflow-start": WorkflowStartNode,
} as const
