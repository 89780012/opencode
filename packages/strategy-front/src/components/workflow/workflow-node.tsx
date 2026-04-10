import { WorkflowBuildNode } from "./workflow-node-build"
import { WorkflowEndNode } from "./workflow-node-end"
import { WorkflowGateNode } from "./workflow-node-gate"
import { WorkflowIntentNode } from "./workflow-node-intent"
import { WorkflowJudgeNode } from "./workflow-node-judge"
import { WorkflowPlanNode } from "./workflow-node-plan"
import { WorkflowReviewNode } from "./workflow-node-review"
import { WorkflowStartNode } from "./workflow-node-start"

export const workflowNodeTypes = {
  "workflow-build": WorkflowBuildNode,
  "workflow-end": WorkflowEndNode,
  "workflow-gate": WorkflowGateNode,
  "workflow-intent": WorkflowIntentNode,
  "workflow-judge": WorkflowJudgeNode,
  "workflow-plan": WorkflowPlanNode,
  "workflow-review": WorkflowReviewNode,
  "workflow-start": WorkflowStartNode,
} as const
