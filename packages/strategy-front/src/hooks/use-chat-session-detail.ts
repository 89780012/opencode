import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";

import { chatApi } from "@/api/modules";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import type {
  ChatMessage,
  ChatSessionDetailState,
  PersistedChatMessage,
  PlanStepState,
} from "@/types/chat";

const createEmptySessionDetail = (): ChatSessionDetailState => ({
  messages: [],
  planGoal: "",
  pendingPlanSteps: [],
  isStreaming: false,
  loaded: false,
});

const resolveStateAction = <T>(
  action: SetStateAction<T>,
  previousState: T,
): T =>
  typeof action === "function"
    ? (action as (previousState: T) => T)(previousState)
    : action;

/** 将后端持久化消息转换为前端渲染使用的消息结构。 */
const toChatMessage = (message: PersistedChatMessage): ChatMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: new Date(message.created_at),
  kind: message.kind,
  taskId: message.task_id ?? undefined,
  taskStatus: message.task_status ?? undefined,
  taskDetail: message.task_detail ?? undefined,
  taskResult: message.task_result ?? undefined,
});

interface UseChatSessionDetailOptions {
  sessionId: string | null;
}

interface UseChatSessionDetailResult {
  messages: ChatMessage[];
  planGoal: string;
  pendingPlanSteps: PlanStepState[];
  isStreaming: boolean;
  hasStreamingSession: boolean;
  setSessionMessages: (
    sessionId: string,
    value: SetStateAction<ChatMessage[]>,
  ) => void;
  setSessionPlanGoal: (sessionId: string, value: SetStateAction<string>) => void;
  setSessionPendingPlanSteps: (
    sessionId: string,
    value: SetStateAction<PlanStepState[]>,
  ) => void;
  setSessionStreaming: (sessionId: string, isStreaming: boolean) => void;
}

export function useChatSessionDetail(
  options: UseChatSessionDetailOptions,
): UseChatSessionDetailResult {
  const { sessionId } = options;
  const { setSessionStreaming: setGlobalSessionStreaming } = useChatSessions();
  const [sessionDetails, setSessionDetails] = useState<
    Record<string, ChatSessionDetailState>
  >({});
  const sessionDetailsRef = useRef(sessionDetails);

  useEffect(() => {
    sessionDetailsRef.current = sessionDetails;
  }, [sessionDetails]);

  const setSessionMessages = useCallback(
    (targetSessionId: string, value: SetStateAction<ChatMessage[]>) => {
      setSessionDetails((prev) => {
        const current = prev[targetSessionId] ?? createEmptySessionDetail();
        return {
          ...prev,
          [targetSessionId]: {
            ...current,
            messages: resolveStateAction(value, current.messages),
            loaded: true,
          },
        };
      });
    },
    [],
  );

  const setSessionPlanGoal = useCallback(
    (targetSessionId: string, value: SetStateAction<string>) => {
      setSessionDetails((prev) => {
        const current = prev[targetSessionId] ?? createEmptySessionDetail();
        return {
          ...prev,
          [targetSessionId]: {
            ...current,
            planGoal: resolveStateAction(value, current.planGoal),
            loaded: true,
          },
        };
      });
    },
    [],
  );

  const setSessionPendingPlanSteps = useCallback(
    (targetSessionId: string, value: SetStateAction<PlanStepState[]>) => {
      setSessionDetails((prev) => {
        const current = prev[targetSessionId] ?? createEmptySessionDetail();
        return {
          ...prev,
          [targetSessionId]: {
            ...current,
            pendingPlanSteps: resolveStateAction(value, current.pendingPlanSteps),
            loaded: true,
          },
        };
      });
    },
    [],
  );

  const setSessionStreaming = useCallback(
    (targetSessionId: string, isStreaming: boolean) => {
      setSessionDetails((prev) => {
        const current = prev[targetSessionId] ?? createEmptySessionDetail();
        return {
          ...prev,
          [targetSessionId]: {
            ...current,
            isStreaming,
            loaded: true,
          },
        };
      });

      setGlobalSessionStreaming(targetSessionId, isStreaming);
    },
    [setGlobalSessionStreaming],
  );

  /**
   * 切换会话时，按会话维度拉取历史消息。
   * 如果该会话已经在本地加载过，或者当前正在流式输出，则直接复用本地状态。
   */
  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      return () => {
        cancelled = true;
      };
    }

    const currentDetail = sessionDetailsRef.current[sessionId];
    if (currentDetail?.loaded || currentDetail?.isStreaming) {
      return () => {
        cancelled = true;
      };
    }

    const loadSessionDetail = async () => {
      try {
        const data = await chatApi.getSessionDetail(sessionId);
        if (cancelled) {
          return;
        }

        setSessionDetails((prev) => {
          const latest = prev[sessionId] ?? createEmptySessionDetail();
          if (latest.isStreaming) {
            return prev;
          }

          return {
            ...prev,
            [sessionId]: {
              ...latest,
              messages: data.messages.map(toChatMessage),
              planGoal: latest.planGoal,
              pendingPlanSteps: latest.pendingPlanSteps,
              loaded: true,
            },
          };
        });
      } catch (error) {
        console.error("Failed to load chat session detail", error);
      }
    };

    void loadSessionDetail();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const activeSessionDetail = useMemo(() => {
    if (!sessionId) {
      return createEmptySessionDetail();
    }

    return sessionDetails[sessionId] ?? createEmptySessionDetail();
  }, [sessionDetails, sessionId]);

  const hasStreamingSession = useMemo(
    () => Object.values(sessionDetails).some((detail) => detail.isStreaming),
    [sessionDetails],
  );

  return {
    messages: activeSessionDetail.messages,
    planGoal: activeSessionDetail.planGoal,
    pendingPlanSteps: activeSessionDetail.pendingPlanSteps,
    isStreaming: activeSessionDetail.isStreaming,
    hasStreamingSession,
    setSessionMessages,
    setSessionPlanGoal,
    setSessionPendingPlanSteps,
    setSessionStreaming,
  };
}
