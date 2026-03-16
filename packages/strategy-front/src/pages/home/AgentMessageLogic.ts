import type { Dispatch, SetStateAction } from "react";

import { chatApi, connectAgentStream } from "@/api/modules";
import type {
  ChatMessage,
  ErrorEvent,
  PlanEvent,
  PlanStepState,
  StepEvent,
  TaskState,
  ToolEvent,
} from "@/types/chat";

const createMessageId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type SessionStateSetter<T> = (
  sessionId: string,
  value: SetStateAction<T>,
) => void;

type AgentMessageLogicOptions = {
  setMessages: SessionStateSetter<ChatMessage[]>;
  setInputValue: StateSetter<string>;
  setSessionStreaming: (sessionId: string, isStreaming: boolean) => void;
  setPlanGoal: SessionStateSetter<string>;
  setPendingPlanSteps: SessionStateSetter<PlanStepState[]>;
  onStreamStart?: (sessionId: string) => void;
  onStreamComplete?: (sessionId: string) => void | Promise<void>;
};

type SessionStreamState = {
  cancelStream: (() => void) | null;
  activeAssistantMessageId: string | null;
  activeStreamToken: string | null;
};

const createSessionStreamState = (): SessionStreamState => ({
  cancelStream: null,
  activeAssistantMessageId: null,
  activeStreamToken: null,
});

const stringifyToolValue = (value: unknown): string => {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const formatToolResult = (event: ToolEvent): string | undefined => {
  const result = event.function_result;
  if (!result) {
    return undefined;
  }

  const dataText = stringifyToolValue(result.data).trim();
  const messageText = (result.message || "").trim();

  if (dataText && messageText && dataText !== messageText) {
    return `${messageText}\n\n${dataText}`;
  }
  if (dataText) {
    return dataText;
  }
  if (messageText) {
    return messageText;
  }
  if (result.success) {
    return "工具执行完成";
  }
  return undefined;
};

type MessageToolPayload = {
  action: "ask" | "notify";
  text: string;
};

const getMessageToolPayload = (
  event: ToolEvent,
): MessageToolPayload | undefined => {
  const data = event.function_result?.data;
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const action = Reflect.get(data, "action");
  const text = Reflect.get(data, "text");
  if (
    (action === "ask" || action === "notify") &&
    typeof text === "string" &&
    text.trim()
  ) {
    return {
      action,
      text: text.trim(),
    };
  }

  return undefined;
};

export class AgentMessageLogic {
  private setMessages!: SessionStateSetter<ChatMessage[]>;
  private setInputValue!: StateSetter<string>;
  private setSessionStreaming!: (
    sessionId: string,
    isStreaming: boolean,
  ) => void;
  private setPlanGoal!: SessionStateSetter<string>;
  private setPendingPlanSteps!: SessionStateSetter<PlanStepState[]>;
  private onStreamStart?: (sessionId: string) => void;
  private onStreamComplete?: (sessionId: string) => void | Promise<void>;

  private disposed = false;
  private sessionStreamStates = new Map<string, SessionStreamState>();

  constructor(options: AgentMessageLogicOptions) {
    this.updateOptions(options);
  }

  updateOptions(options: AgentMessageLogicOptions): void {
    this.setMessages = options.setMessages;
    this.setInputValue = options.setInputValue;
    this.setSessionStreaming = options.setSessionStreaming;
    this.setPlanGoal = options.setPlanGoal;
    this.setPendingPlanSteps = options.setPendingPlanSteps;
    this.onStreamStart = options.onStreamStart;
    this.onStreamComplete = options.onStreamComplete;
  }

  submit(text: string, sessionId: string): boolean {
    if (this.disposed) {
      this.disposed = false;
    }

    const prompt = text.trim();
    const sessionState = this.getSessionState(sessionId);
    if (!prompt || sessionState.cancelStream) {
      return false;
    }

    const streamToken = createMessageId();
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    this.setMessages(sessionId, (prev) => [...prev, userMessage]);
    this.setInputValue("");
    this.setStreaming(sessionId, true);
    this.setPlanGoal(sessionId, "");
    this.setPendingPlanSteps(sessionId, []);
    this.onStreamStart?.(sessionId);

    this.resetSessionWriter(sessionId);
    sessionState.activeStreamToken = streamToken;

    sessionState.cancelStream = connectAgentStream(
      { message: prompt, session_id: sessionId },
      {
        onPlan: (event) => {
          if (!this.isActiveStream(sessionId, streamToken)) {
            return;
          }
          this.syncPlan(sessionId, event);
        },
        onStep: (event) => {
          if (!this.isActiveStream(sessionId, streamToken)) {
            return;
          }
          this.handleStepEvent(sessionId, event);
        },
        onMessage: (event) => {
          if (!this.isActiveStream(sessionId, streamToken) || !event.message) {
            return;
          }
          this.appendToAssistantMessage(
            sessionId,
            event.message_id ?? event.id,
            event.message,
          );
        },
        onTool: (event) => {
          if (!this.isActiveStream(sessionId, streamToken)) {
            return;
          }
          this.handleToolEvent(sessionId, event);
        },
        onWait: () => {
          this.finishStreamingSession(sessionId, streamToken);
        },
        onError: (event) => {
          this.handleStreamError(sessionId, streamToken, event);
        },
        onDone: () => {
          this.finishStreamingSession(sessionId, streamToken);
        },
        onClose: () => {
          if (!this.isActiveStream(sessionId, streamToken)) {
            return;
          }

          this.finishStreamingSession(sessionId, streamToken);
          this.clearStreamState(sessionId, streamToken);
          void this.onStreamComplete?.(sessionId);
        },
      },
    );

    return true;
  }

  async interrupt(sessionId: string): Promise<boolean> {
    if (this.disposed) {
      return false;
    }

    const sessionState = this.getSessionState(sessionId);
    const streamToken = sessionState.activeStreamToken;
    const cancelStream = sessionState.cancelStream;

    if (!streamToken || !cancelStream) {
      return false;
    }

    this.finishStreamingSession(sessionId, streamToken);
    sessionState.cancelStream = null;
    sessionState.activeStreamToken = null;
    cancelStream();

    try {
      await chatApi.interruptStream(sessionId);
    } catch (error) {
      console.error("Failed to interrupt chat stream", error);
    }

    await this.onStreamComplete?.(sessionId);
    return true;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    Array.from(this.sessionStreamStates.entries()).forEach(
      ([sessionId, state]) => {
        if (state.cancelStream) {
          state.cancelStream();
          state.cancelStream = null;
        }
        state.activeAssistantMessageId = null;
        state.activeStreamToken = null;
        this.setSessionStreaming(sessionId, false);
      },
    );
  }

  private getSessionState(sessionId: string): SessionStreamState {
    const existing = this.sessionStreamStates.get(sessionId);
    if (existing) {
      return existing;
    }

    const next = createSessionStreamState();
    this.sessionStreamStates.set(sessionId, next);
    return next;
  }

  private isActiveStream(sessionId: string, streamToken: string): boolean {
    const sessionState = this.sessionStreamStates.get(sessionId);
    return sessionState?.activeStreamToken === streamToken;
  }

  private clearStreamState(sessionId: string, streamToken: string): void {
    const sessionState = this.sessionStreamStates.get(sessionId);
    if (!sessionState || sessionState.activeStreamToken !== streamToken) {
      return;
    }

    sessionState.cancelStream = null;
    sessionState.activeAssistantMessageId = null;
    sessionState.activeStreamToken = null;
  }

  private resetSessionWriter(sessionId: string): void {
    const sessionState = this.getSessionState(sessionId);
    sessionState.activeAssistantMessageId = null;
  }

  private setStreaming(sessionId: string, next: boolean): void {
    if (this.disposed) {
      return;
    }

    this.setSessionStreaming(sessionId, next);
  }

  private setMessagesForSession(
    sessionId: string,
    value: SetStateAction<ChatMessage[]>,
  ): void {
    if (this.disposed) {
      return;
    }

    this.setMessages(sessionId, value);
  }

  private switchActiveAssistantMessage(
    sessionId: string,
    messageId: string,
  ): void {
    const sessionState = this.getSessionState(sessionId);
    if (!messageId || sessionState.activeAssistantMessageId === messageId) {
      return;
    }

    this.stopActiveAssistantStreaming(sessionId);
    sessionState.activeAssistantMessageId = messageId;
  }

  private appendToAssistantMessage(
    sessionId: string,
    messageId: string,
    content: string,
  ): void {
    if (this.disposed || !messageId || !content) {
      return;
    }

    this.switchActiveAssistantMessage(sessionId, messageId);

    this.setMessagesForSession(sessionId, (prev) => {
      const next = [...prev];
      let index = next.findIndex((message) => message.id === messageId);

      const validAssistantMessage =
        index >= 0 &&
        next[index].role === "assistant" &&
        next[index].kind !== "task" &&
        next[index].kind !== "tool";

      if (!validAssistantMessage) {
        const newAssistantMessage: ChatMessage = {
          id: messageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          kind: "text",
          isStreaming: true,
        };
        next.push(newAssistantMessage);
        index = next.length - 1;
      }

      if (index < 0) {
        return next;
      }

      const target = next[index];
      next[index] = {
        ...target,
        content: target.content + content,
        isStreaming: true,
      };
      return next;
    });
  }

  private stopActiveAssistantStreaming(sessionId: string): void {
    if (this.disposed) {
      return;
    }

    const sessionState = this.getSessionState(sessionId);
    const activeMessageId = sessionState.activeAssistantMessageId;
    if (!activeMessageId) {
      return;
    }

    this.setMessagesForSession(sessionId, (prev) => {
      const index = prev.findIndex((message) => message.id === activeMessageId);
      if (index === -1) {
        return prev;
      }

      const target = prev[index];
      if (
        target.role !== "assistant" ||
        target.kind === "task" ||
        target.kind === "tool" ||
        !target.isStreaming
      ) {
        return prev;
      }

      const next = [...prev];
      if (!target.content.trim()) {
        next.splice(index, 1);
        return next;
      }

      next[index] = {
        ...target,
        isStreaming: false,
      };
      return next;
    });
  }

  private closeCurrentTextSegment(sessionId: string): void {
    if (this.disposed) {
      return;
    }

    this.stopActiveAssistantStreaming(sessionId);
    this.getSessionState(sessionId).activeAssistantMessageId = null;
  }

  private upsertTaskMessage(sessionId: string, task: TaskState): void {
    if (this.disposed) {
      return;
    }

    this.setMessagesForSession(sessionId, (prev) => {
      const kind = task.kind ?? "task";
      const index = prev.findIndex(
        (message) => message.kind === kind && message.taskId === task.id,
      );

      if (index !== -1) {
        const target = prev[index];
        const next = [...prev];
        next[index] = {
          ...target,
          content: task.title,
          taskStatus: task.status,
          taskDetail: task.detail,
          taskResult: task.result,
        };
        return next;
      }

      const taskMessage: ChatMessage = {
        id: `${kind}-${task.id}`,
        role: "assistant",
        content: task.title,
        timestamp: new Date(),
        kind,
        taskId: task.id,
        taskStatus: task.status,
        taskDetail: task.detail,
        taskResult: task.result,
      };

      return [...prev, taskMessage];
    });
  }

  private upsertInfoMessage(
    sessionId: string,
    message: Pick<ChatMessage, "id" | "kind" | "content">,
  ): void {
    if (this.disposed) {
      return;
    }

    this.setMessagesForSession(sessionId, (prev) => {
      const index = prev.findIndex((item) => item.id === message.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          content: message.content,
          kind: message.kind,
          isStreaming: false,
        };
        return next;
      }

      return [
        ...prev,
        {
          id: message.id,
          role: "assistant",
          content: message.content,
          timestamp: new Date(),
          kind: message.kind,
          isStreaming: false,
        },
      ];
    });
  }

  private syncPlan(sessionId: string, event: PlanEvent): void {
    if (this.disposed) {
      return;
    }

    const plan = event.plan;
    if (!plan) {
      this.setPlanGoal(sessionId, "");
      this.setPendingPlanSteps(sessionId, []);
      return;
    }

    this.setPlanGoal(sessionId, plan.goal || "");
    this.setPendingPlanSteps(
      sessionId,
      (plan.steps || []).map((step) => ({
        id: step.id,
        description: step.description,
        status: step.status,
      })),
    );
  }

  private handleStepEvent(sessionId: string, event: StepEvent): void {
    if (this.disposed) {
      return;
    }

    this.closeCurrentTextSegment(sessionId);
    const taskId = `step-${event.step.id}`;

    if (event.status === "started") {
      this.upsertTaskMessage(sessionId, {
        id: taskId,
        title: `${event.step.description} 正在进行`,
        status: "running",
      });
      return;
    }

    if (event.status === "completed") {
      this.upsertTaskMessage(sessionId, {
        id: taskId,
        title: `${event.step.description} 已完成`,
        status: "completed",
        result: event.step.result || "",
      });
      return;
    }

    if (event.status === "failed") {
      this.upsertTaskMessage(sessionId, {
        id: taskId,
        title: `${event.step.description} 执行失败`,
        status: "failed",
        detail: event.step.error || "未知错误",
      });
    }
  }

  private handleToolEvent(sessionId: string, event: ToolEvent): void {
    if (this.disposed) {
      return;
    }

    this.closeCurrentTextSegment(sessionId);

    if (
      event.function_name === "message_notify_user" ||
      event.function_name === "message_ask_user"
    ) {
      if (event.status !== "called") {
        return;
      }

      const payload = getMessageToolPayload(event);
      if (!payload) {
        return;
      }

      this.upsertInfoMessage(sessionId, {
        id: `${payload.action}-${event.tool_call_id}`,
        kind: payload.action,
        content: payload.text,
      });
      return;
    }

    const taskId = `tool-${event.tool_call_id}`;

    if (event.status === "calling") {
      this.upsertTaskMessage(sessionId, {
        id: taskId,
        title: event.function_name,
        status: "running",
        kind: "tool",
      });
      return;
    }

    const toolSuccess = event.function_result?.success ?? true;
    const toolDetail = toolSuccess
      ? undefined
      : event.function_result?.message || "工具执行失败";
    const toolResult = formatToolResult(event);

    this.upsertTaskMessage(sessionId, {
      id: taskId,
      title: event.function_name,
      status: toolSuccess ? "completed" : "failed",
      kind: "tool",
      detail: toolDetail,
      result: toolResult !== toolDetail ? toolResult : undefined,
    });
  }

  private handleStreamError(
    sessionId: string,
    streamToken: string,
    event: ErrorEvent,
  ): void {
    if (this.disposed || !this.isActiveStream(sessionId, streamToken)) {
      return;
    }

    const sessionState = this.getSessionState(sessionId);
    const errorMessageId =
      sessionState.activeAssistantMessageId ?? `error-${event.id}`;
    this.appendToAssistantMessage(
      sessionId,
      errorMessageId,
      `\n\n错误: ${event.error}\n`,
    );
    this.stopActiveAssistantStreaming(sessionId);
    sessionState.activeAssistantMessageId = null;
    this.setStreaming(sessionId, false);
  }

  private finishStreamingSession(sessionId: string, streamToken: string): void {
    if (this.disposed || !this.isActiveStream(sessionId, streamToken)) {
      return;
    }

    const sessionState = this.getSessionState(sessionId);
    this.stopActiveAssistantStreaming(sessionId);
    sessionState.activeAssistantMessageId = null;
    this.setStreaming(sessionId, false);
  }
}
