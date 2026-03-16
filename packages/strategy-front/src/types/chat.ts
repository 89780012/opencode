export type EventType =
  | "plan"
  | "step"
  | "message"
  | "tool"
  | "wait"
  | "error"
  | "done";

export interface BaseEvent {
  id: string;
  type: EventType;
  created_at: string;
}

export interface PlanEvent extends BaseEvent {
  type: "plan";
  plan: {
    id: string;
    title: string;
    goal: string;
    language: string;
    steps: Array<{
      id: string;
      description: string;
      status: "pending" | "running" | "completed" | "failed";
      result?: string;
      error?: string;
      success: boolean;
      attachments: string[];
    }>;
    message: string;
    status: "pending" | "running" | "completed" | "failed";
    error?: string;
  };
  status: "created" | "updated" | "completed";
}

export interface StepEvent extends BaseEvent {
  type: "step";
  step: {
    id: string;
    description: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: string;
    error?: string;
    success: boolean;
    attachments: string[];
  };
  status: "started" | "completed" | "failed";
}

export interface MessageEvent extends BaseEvent {
  type: "message";
  role: "user" | "assistant";
  message: string;
  message_id?: string;
}

export interface ToolEvent extends BaseEvent {
  type: "tool";
  tool_call_id: string;
  tool_name: string;
  function_name: string;
  function_args: Record<string, unknown>;
  function_result?: {
    success: boolean;
    message: string;
    data?: unknown;
  };
  status: "calling" | "called";
}

export interface WaitEvent extends BaseEvent {
  type: "wait";
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  error: string;
}

export interface DoneEvent extends BaseEvent {
  type: "done";
}

export type AgentEvent =
  | PlanEvent
  | StepEvent
  | MessageEvent
  | ToolEvent
  | WaitEvent
  | ErrorEvent
  | DoneEvent;

export interface AgentChatRequest {
  message: string;
  session_id: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionListData {
  sessions: ChatSessionSummary[];
}

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "task" | "tool" | "ask" | "notify";
  content: string;
  task_id?: string | null;
  task_status?: "running" | "completed" | "failed" | null;
  task_detail?: string | null;
  task_result?: string | null;
  created_at: string;
}

export interface ChatSessionDetailData {
  session: ChatSessionSummary;
  messages: PersistedChatMessage[];
}

export interface CreateChatSessionRequest {
  title?: string;
}

export type PlanStepState = {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
};

export type TaskState = {
  id: string;
  title: string;
  status: "running" | "completed" | "failed";
  kind?: "task" | "tool";
  detail?: string;
  result?: string;
};

export type ChatSessionDetailState = {
  messages: ChatMessage[];
  planGoal: string;
  pendingPlanSteps: PlanStepState[];
  isStreaming: boolean;
  loaded: boolean;
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  kind?: "text" | "task" | "tool" | "ask" | "notify";
  taskId?: string;
  taskStatus?: "running" | "completed" | "failed";
  taskDetail?: string;
  taskResult?: string;
}
