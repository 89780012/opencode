import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { AgentMessageLogic } from "@/pages/home/AgentMessageLogic";
import type { ChatMessage, PlanStepState } from "@/types/chat";

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type SessionStateSetter<T> = (
  sessionId: string,
  value: SetStateAction<T>,
) => void;

interface UseAgentMessageLogicOptions {
  setMessages: SessionStateSetter<ChatMessage[]>;
  setInputValue: StateSetter<string>;
  setSessionStreaming: (sessionId: string, isStreaming: boolean) => void;
  setPlanGoal: SessionStateSetter<string>;
  setPendingPlanSteps: SessionStateSetter<PlanStepState[]>;
  onStreamStart?: (sessionId: string) => void;
  onStreamComplete?: (sessionId: string) => void | Promise<void>;
}

interface UseAgentMessageLogicResult {
  submit: (text: string, sessionId: string) => boolean;
  interrupt: (sessionId: string) => Promise<boolean>;
}

export function useAgentMessageLogic(
  options: UseAgentMessageLogicOptions,
): UseAgentMessageLogicResult {
  const logicRef = useRef<AgentMessageLogic | null>(null);

  /** 只在首次渲染时创建一次消息逻辑实例，避免重复初始化。 */
  if (logicRef.current == null) {
    logicRef.current = new AgentMessageLogic(options);
  } else {
    logicRef.current.updateOptions(options);
  }

  /** 组件卸载时释放流式连接和内部定时器。 */
  useEffect(() => {
    return () => {
      logicRef.current?.dispose();
    };
  }, []);

  /** 对外暴露统一的提交方法，屏蔽实例细节。 */
  const submit = (text: string, sessionId: string): boolean =>
    logicRef.current?.submit(text, sessionId) ?? false;

  const interrupt = async (sessionId: string): Promise<boolean> =>
    (await logicRef.current?.interrupt(sessionId)) ?? false;

  return { submit, interrupt };
}
