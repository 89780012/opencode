import { useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ChatMessageList } from "@/components/chat-message-list";
import { WorkspaceEditorPane } from "@/components/workspace/workspace-editor-pane";
import { useAgentMessageLogic } from "@/hooks/use-agent-message-logic";
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useAppSelector } from "@/hooks/useAppSelector";
import { cn } from "@/lib/utils";
import { FaThinkPeaks } from "react-icons/fa";
import { IoCloudUploadOutline } from "react-icons/io5";
import { TbNetwork } from "react-icons/tb";
import { ChatSessionSummary, PlanStepState } from "@/types/chat";

export default function Home() {
  const [inputValue, setInputValue] = useState(""); //输入文本
  const [isPlanPanelCollapsed, setIsPlanPanelCollapsed] = useState(false); //是否折叠计划面板

  // 选中的工作空间
  const selectedWorkspace = useAppSelector(
    (state) => state.workspaceView.selectedWorkspace,
  );
  const { createSession, refreshSessions, selectedSessionId } =
    useChatSessions();
  const {
    messages,
    planGoal,
    pendingPlanSteps,
    isStreaming,
    setSessionMessages,
    setSessionPlanGoal,
    setSessionPendingPlanSteps,
    setSessionStreaming,
  } = useChatSessionDetail({ sessionId: selectedSessionId });
  const visibleMessages = selectedSessionId ? messages : [];
  const visiblePlanGoal = selectedSessionId ? planGoal : "";
  const visiblePendingPlanSteps = selectedSessionId ? pendingPlanSteps : [];

  const { submit, interrupt } = useAgentMessageLogic({
    setMessages: setSessionMessages,
    setInputValue,
    setSessionStreaming,
    setPlanGoal: setSessionPlanGoal,
    setPendingPlanSteps: setSessionPendingPlanSteps,
    onStreamStart: () => setIsPlanPanelCollapsed(false),
    onStreamComplete: async () => {
      try {
        await refreshSessions();
      } catch (error) {
        console.error("Failed to refresh chat sessions", error);
      }
    },
  });

  /**
   * 发送消息。
   * - 已有会话：直接把消息发送到当前会话
   * - 没有会话：先创建会话，再发送首条消息
   */
  const handleSubmit = async (text: string) => {
    const prompt = text.trim();
    const sessionId = selectedSessionId;
    if (isStreaming && sessionId) {
      await interrupt(sessionId);
      if (!prompt) {
        return;
      }
    }

    if (!prompt) {
      return;
    }

    if (!sessionId) {
      let createdSession: ChatSessionSummary;
      try {
        createdSession = await createSession();
      } catch (error) {
        console.error("Failed to create chat session", error);
        return;
      }

      const accepted = submit(prompt, createdSession.id);
      if (!accepted) {
        return;
      }
      return;
    }

    submit(prompt, sessionId);
  };

  const hasMessages = visibleMessages.length > 0;
  const getPlanStepMeta = (status: PlanStepState["status"]) => {
    if (status === "completed") {
      return {
        rowClassName: "border-emerald-200/80 bg-emerald-50/70",
        textClassName: "text-[#4A4A4A]",
        badgeClassName: "bg-emerald-100 text-emerald-700",
        label: "完成",
      };
    }
    if (status === "running") {
      return {
        rowClassName: "border-blue-200/80 bg-blue-50/70",
        textClassName: "font-medium text-[#1D4ED8]",
        badgeClassName: "bg-blue-100 text-blue-700",
        label: "执行中",
      };
    }
    if (status === "failed") {
      return {
        rowClassName: "border-red-200/80 bg-red-50/70",
        textClassName: "font-medium text-[#DC2626]",
        badgeClassName: "bg-red-100 text-red-700",
        label: "失败",
      };
    }
    return {
      rowClassName: "border-[#E8E8E8] bg-white",
      textClassName: "text-[#4A4A4A]",
      badgeClassName: "bg-[#F3F4F6] text-[#6B7280]",
      label: "待执行",
    };
  };

  return (
    <div className="flex h-full w-full min-w-0">
      {selectedWorkspace ? (
        <div className="flex-1 min-w-0">
          <WorkspaceEditorPane workspace={selectedWorkspace} />
        </div>
      ) : null}

      <div
        className={`${selectedWorkspace ? "w-[30%]" : "w-full"} relative flex h-full min-w-0 items-center justify-center`}
      >
        <div className="flex h-full w-full min-h-0 flex-col">
          <ChatMessageList
            messages={visibleMessages}
            isStreaming={isStreaming}
          />
          <div
            className={
              hasMessages
                ? "shrink-0"
                : "absolute inset-0 flex items-center justify-center"
            }
          >
            <div
              className={cn(
                "mx-auto w-full px-4 py-2",
                selectedWorkspace ? "max-w-[640px]" : "max-w-[776px]",
              )}
            >
              {!hasMessages ? (
                <div className="mb-8 h-8 text-center text-2xl font-bold">
                  今天想让我帮你做什么？
                </div>
              ) : null}

              {/** 待执行计划 */}
              {visiblePendingPlanSteps.length > 0 ? (
                <div className="mb-2 rounded-xl border border-[#E8E8E8] bg-white/90 text-sm shadow-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="truncate font-medium text-[#222]">
                      执行计划{visiblePlanGoal ? `：${visiblePlanGoal}` : ""}
                    </div>
                    <button
                      type="button"
                      className="ml-2 shrink-0 text-xs text-[#666] hover:text-[#111]"
                      onClick={() => setIsPlanPanelCollapsed((prev) => !prev)}
                    >
                      {isPlanPanelCollapsed ? "展开" : "收起"}
                    </button>
                  </div>
                  {!isPlanPanelCollapsed ? (
                    <div className="custom-scrollbar max-h-32 space-y-1.5 overflow-y-auto px-3 pb-3">
                      {visiblePendingPlanSteps.map((step, index) => {
                        const meta = getPlanStepMeta(step.status);
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2",
                              meta.rowClassName,
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9A9A9A]">
                                Step {index + 1}
                              </div>
                              <div
                                className={cn(
                                  "break-words text-[13px] leading-5",
                                  meta.textClassName,
                                )}
                              >
                                {step.description}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                meta.badgeClassName,
                              )}
                            >
                              {meta.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <PromptInput
                onSubmit={({ text }) => {
                  void handleSubmit(text);
                }}
                onValueChange={setInputValue}
                value={inputValue}
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    maxHeight={hasMessages ? 65 : 200}
                    minHeight={65}
                    placeholder="请输入消息..."
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools className="left text-center">
                    <PromptInputButton className="h-8 rounded-xl border border-[#E6E6E6] px-3">
                      <FaThinkPeaks />
                      <span className="leading-8">深度思考</span>
                    </PromptInputButton>
                    <PromptInputButton className="h-8 rounded-xl border border-[#E6E6E6] px-3">
                      <TbNetwork />
                      <span className="leading-8">联网搜索</span>
                    </PromptInputButton>
                  </PromptInputTools>
                  <div className="right flex items-center">
                    <PromptInputButton
                      className="h-8 w-8 text-2xl"
                      size="icon-sm"
                    >
                      <IoCloudUploadOutline />
                    </PromptInputButton>
                    <PromptInputSubmit
                      className="ml-3"
                      disabled={!isStreaming && inputValue.trim().length === 0}
                      status={isStreaming ? "streaming" : "ready"}
                    />
                  </div>
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
