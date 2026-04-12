import { WorkflowCheckNode } from "./workflow-node-check"
import { WorkflowEndNode } from "./workflow-node-end"
import { WorkflowExecuteNode } from "./workflow-node-execute"
import { WorkflowPlanNode } from "./workflow-node-plan"
import { WorkflowRespondNode } from "./workflow-node-respond"
import { WorkflowRouterNode } from "./workflow-node-router"
import { WorkflowStartNode } from "./workflow-node-start"

export const workflowNodeTypes = {
  "workflow-check": WorkflowCheckNode,
  "workflow-end": WorkflowEndNode,
  "workflow-execute": WorkflowExecuteNode,
  "workflow-plan": WorkflowPlanNode,
  "workflow-respond": WorkflowRespondNode,
  "workflow-router": WorkflowRouterNode,
  "workflow-start": WorkflowStartNode,
} as const
