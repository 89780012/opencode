import { request } from "@/api";
import { apiConfig } from "@/api/config";
import {
  PlanEvent,
  StepEvent,
  MessageEvent,
  ToolEvent,
  WaitEvent,
  ErrorEvent,
  DoneEvent,
  AgentEvent,
  AgentChatRequest,
  ChatSessionDetailData,
  ChatSessionListData,
  ChatSessionSummary,
  CreateChatSessionRequest,
} from "@/types/chat";

export const chatApi = {
  listSessions(): Promise<ChatSessionListData> {
    return request.get<ChatSessionListData>("/chat/sessions");
  },

  createSession(
    payload: CreateChatSessionRequest = {},
  ): Promise<ChatSessionSummary> {
    return request.post<ChatSessionSummary, CreateChatSessionRequest>(
      "/chat/sessions",
      payload,
    );
  },

  getSessionDetail(sessionId: string): Promise<ChatSessionDetailData> {
    return request.get<ChatSessionDetailData>(`/chat/sessions/${sessionId}`);
  },

  interruptStream(sessionId: string): Promise<{ session_id: string }> {
    return request.post<{ session_id: string }, { session_id: string }>(
      "/chat/agent/interrupt",
      { session_id: sessionId },
    );
  },
};
/**
 * SSE事件处理器
 */
export interface AgentEventHandlers {
  onPlan?: (event: PlanEvent) => void;
  onStep?: (event: StepEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onTool?: (event: ToolEvent) => void;
  onWait?: (event: WaitEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onDone?: (event: DoneEvent) => void;
  onClose?: () => void;
}

/**
 * 连接Agent流式聊天接口
 */
export function connectAgentStream(
  payload: AgentChatRequest,
  handlers: AgentEventHandlers,
): () => void {
  const url = `${apiConfig.baseURL}/chat/agent/stream`;
  let isClosed = false;
  let hasClosed = false;
  let buffer = "";

  const closeOnce = () => {
    if (hasClosed) {
      return;
    }
    hasClosed = true;
    handlers.onClose?.();
  };

  const processBuffer = () => {
    while (!isClosed) {
      const eventEnd = buffer.indexOf("\n\n");
      if (eventEnd === -1) {
        break;
      }

      const rawEvent = buffer.slice(0, eventEnd).trim();
      buffer = buffer.slice(eventEnd + 2);
      if (!rawEvent) {
        continue;
      }

      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!data) {
        continue;
      }

      try {
        const event = JSON.parse(data) as AgentEvent;
        handleEvent(event, handlers);
      } catch (error) {
        console.error("Failed to parse SSE data:", error, data);
      }
    }
  };

  // 使用 fetch 发送 POST 请求并建立 SSE 连接
  const controller = new AbortController();

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is null");
      }

      while (!isClosed) {
        const { done, value } = await reader.read();

        if (done) {
          processBuffer();
          closeOnce();
          break;
        }

        buffer += decoder
          .decode(value, { stream: true })
          .replace(/\r\n/g, "\n");
        processBuffer();
      }
    })
    .catch((error) => {
      if (error?.name === "AbortError") {
        closeOnce();
        return;
      }
      if (!isClosed) {
        console.error("SSE connection error:", error);
        handlers.onError?.({
          id: crypto.randomUUID(),
          type: "error",
          created_at: new Date().toISOString(),
          error: error.message || "连接失败",
        });
      }
      closeOnce();
    });

  // 返回取消函数
  return () => {
    isClosed = true;
    controller.abort();
    closeOnce();
  };
}

/**
 * 处理不同类型的事件
 */
function handleEvent(event: AgentEvent, handlers: AgentEventHandlers): void {
  switch (event.type) {
    case "plan":
      handlers.onPlan?.(event as PlanEvent);
      break;
    case "step":
      handlers.onStep?.(event as StepEvent);
      break;
    case "message":
      handlers.onMessage?.(event as MessageEvent);
      break;
    case "tool":
      handlers.onTool?.(event as ToolEvent);
      break;
    case "wait":
      handlers.onWait?.(event as WaitEvent);
      break;
    case "error":
      handlers.onError?.(event as ErrorEvent);
      break;
    case "done":
      handlers.onDone?.(event as DoneEvent);
      break;
    default:
      console.warn("Unknown event type:", event);
  }
}
