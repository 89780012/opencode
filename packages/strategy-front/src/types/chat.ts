export interface ChatSessionSummary {
  id: string
  title: string
  directory: string
  workspaceID?: string
  parentID?: string
  time: {
    created: number
    updated: number
    archived?: number
  }
}

export interface ChatQuestionOption {
  label: string
  description: string
}

export interface ChatQuestionInfo {
  question: string
  header: string
  options: ChatQuestionOption[]
  multiple?: boolean
  custom?: boolean
}

export interface ChatQuestionTool {
  messageID: string
  callID: string
}

export interface ChatQuestionRequest {
  id: string
  sessionID: string
  questions: ChatQuestionInfo[]
  tool?: ChatQuestionTool
}

export type ChatQuestionAnswer = string[]

export interface PermissionRequest {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: {
    messageID: string
    callID: string
  }
}

export type ChatStatus =
  | {
      type: "idle"
    }
  | {
      type: "busy"
    }
  | {
      type: "retry"
      attempt: number
      message: string
      next: number
    }

export interface ChatTodo {
  content: string
  status: "pending" | "in_progress" | "completed" | "cancelled" | string
  priority: "high" | "medium" | "low" | string
}

export interface ChatError {
  name: string
  data: Record<string, unknown>
}

export interface ChatModelRef {
  providerID: string
  modelID: string
}

export interface ChatFileDiff {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
  status?: "added" | "deleted" | "modified"
}

export interface ChatPartRange {
  start: {
    line: number
    character: number
  }
  end: {
    line: number
    character: number
  }
}

export interface ChatFileSourceText {
  value: string
  start: number
  end: number
}

export type ChatFileSource =
  | {
      type: "file"
      path: string
      text: ChatFileSourceText
    }
  | {
      type: "symbol"
      path: string
      range: ChatPartRange
      name: string
      kind: number
      text: ChatFileSourceText
    }
  | {
      type: "resource"
      clientName: string
      uri: string
      text: ChatFileSourceText
    }

export type ChatToolState =
  | {
      status: "pending"
      input: Record<string, unknown>
      raw: string
    }
  | {
      status: "running"
      input: Record<string, unknown>
      title?: string
      metadata?: Record<string, unknown>
      time: {
        start: number
      }
    }
  | {
      status: "completed"
      input: Record<string, unknown>
      output: string
      title: string
      metadata: Record<string, unknown>
      time: {
        start: number
        end: number
        compacted?: number
      }
      attachments?: ChatFilePart[]
    }
  | {
      status: "error"
      input: Record<string, unknown>
      error: string
      metadata?: Record<string, unknown>
      time: {
        start: number
        end: number
      }
    }

export interface ChatTextPart {
  id: string
  sessionID: string
  messageID: string
  type: "text"
  text: string
  synthetic?: boolean
  ignored?: boolean
  time?: {
    start: number
    end?: number
  }
  metadata?: Record<string, unknown>
}

export interface ChatReasoningPart {
  id: string
  sessionID: string
  messageID: string
  type: "reasoning"
  text: string
  metadata?: Record<string, unknown>
  time: {
    start: number
    end?: number
  }
}

export interface ChatFilePart {
  id: string
  sessionID: string
  messageID: string
  type: "file"
  mime: string
  filename?: string
  url: string
  source?: ChatFileSource
}

export interface ChatToolPart {
  id: string
  sessionID: string
  messageID: string
  type: "tool"
  callID: string
  tool: string
  state: ChatToolState
  metadata?: Record<string, unknown>
}

export interface ChatStepStartPart {
  id: string
  sessionID: string
  messageID: string
  type: "step-start"
  snapshot?: string
}

export interface ChatStepFinishPart {
  id: string
  sessionID: string
  messageID: string
  type: "step-finish"
  reason: string
  snapshot?: string
  cost: number
  tokens: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
}

export interface ChatSnapshotPart {
  id: string
  sessionID: string
  messageID: string
  type: "snapshot"
  snapshot: string
}

export interface ChatPatchPart {
  id: string
  sessionID: string
  messageID: string
  type: "patch"
  hash: string
  files: string[]
}

export interface ChatAgentPart {
  id: string
  sessionID: string
  messageID: string
  type: "agent"
  name: string
  source?: {
    value: string
    start: number
    end: number
  }
}

export interface ChatRetryPart {
  id: string
  sessionID: string
  messageID: string
  type: "retry"
  attempt: number
  error: ChatError
  time: {
    created: number
  }
}

export interface ChatCompactionPart {
  id: string
  sessionID: string
  messageID: string
  type: "compaction"
  auto: boolean
  overflow?: boolean
}

export interface ChatSubtaskPart {
  id: string
  sessionID: string
  messageID: string
  type: "subtask"
  prompt: string
  description: string
  agent: string
  model?: ChatModelRef
  command?: string
}

export type ChatPart =
  | ChatTextPart
  | ChatReasoningPart
  | ChatFilePart
  | ChatToolPart
  | ChatStepStartPart
  | ChatStepFinishPart
  | ChatSnapshotPart
  | ChatPatchPart
  | ChatAgentPart
  | ChatRetryPart
  | ChatCompactionPart
  | ChatSubtaskPart

export interface ChatUserMessage {
  id: string
  sessionID: string
  role: "user"
  time: {
    created: number
  }
  summary?: {
    title?: string
    body?: string
    diffs: ChatFileDiff[]
  }
  agent: string
  model: ChatModelRef
  variant?: string
  system?: string
  tools?: Record<string, boolean>
}

export interface ChatAssistantMessage {
  id: string
  sessionID: string
  role: "assistant"
  time: {
    created: number
    completed?: number
  }
  error?: ChatError
  parentID: string
  modelID: string
  providerID: string
  mode: string
  agent: string
  path: {
    cwd: string
    root: string
  }
  summary?: boolean
  cost: number
  tokens: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
  structured?: unknown
  variant?: string
  finish?: string
}

export type ChatMessageInfo = ChatUserMessage | ChatAssistantMessage

export interface ChatMessageRecord {
  info: ChatMessageInfo
  parts: ChatPart[]
}

export interface ChatView {
  info: ChatMessageInfo
  parts: ChatPart[]
}

export interface ChatTextInput {
  id?: string
  type: "text"
  text: string
}

export interface ChatFileInput {
  id?: string
  type: "file"
  mime: string
  url: string
  filename?: string
}

export interface PromptInputMessage {
  text: string
}

export type ChatInputPart = ChatTextInput | ChatFileInput

export interface ChatPromptBody {
  messageID?: string // 保存问题消息ID
  parts: ChatInputPart[]
  intake?: {
    id: string
    text?: string
  }
}

export type ChatEvent =
  | {
      type: "session.diff"
      properties: {
        sessionID: string
        diff: ChatFileDiff[]
      }
    }
  | {
      type: "session.created"
      properties: {
        info: ChatSessionSummary
      }
    }
  | {
      type: "session.updated"
      properties: {
        info: ChatSessionSummary
      }
    }
  | {
      type: "session.deleted"
      properties: {
        info: ChatSessionSummary
      }
    }
  | {
      type: "session.status"
      properties: {
        sessionID: string
        status: ChatStatus
      }
    }
  | {
      type: "session.idle"
      properties: {
        sessionID: string
      }
    }
  | {
      type: "session.error"
      properties: {
        sessionID?: string
        error?: ChatError
      }
    }
  | {
      type: "message.updated"
      properties: {
        info: ChatMessageInfo
      }
    }
  | {
      type: "message.removed"
      properties: {
        sessionID: string
        messageID: string
      }
    }
  | {
      type: "message.part.updated"
      properties: {
        part: ChatPart
      }
    }
  | {
      type: "message.part.delta"
      properties: {
        sessionID: string
        messageID: string
        partID: string
        field: string
        delta: string
      }
    }
  | {
      type: "message.part.removed"
      properties: {
        sessionID: string
        messageID: string
        partID: string
      }
    }
  | {
      type: "permission.asked"
      properties: PermissionRequest
    }
  | {
      type: "permission.replied"
      properties: {
        sessionID: string
        requestID: string
        reply: "once" | "always" | "reject"
      }
    }
  | {
      type: "question.asked"
      properties: ChatQuestionRequest
    }
  | {
      type: "question.replied"
      properties: {
        sessionID: string
        requestID: string
        answers: ChatQuestionAnswer[]
      }
    }
  | {
      type: "question.rejected"
      properties: {
        sessionID: string
        requestID: string
      }
    }
  | {
      type: "todo.updated"
      properties: {
        sessionID: string
        todos: ChatTodo[]
      }
    }
