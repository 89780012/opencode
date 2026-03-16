import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/chat";
import {
  BellRing,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Wrench,
} from "lucide-react";
import { useState } from "react";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
}

function ToolMessageCard({ message }: { message: ChatMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = message.taskStatus === "running";
  const isCompleted = message.taskStatus === "completed";
  const isFailed = message.taskStatus === "failed";
  const hasOutput = Boolean(message.taskResult || message.taskDetail);
  const statusLabel = isRunning ? "调用中" : isCompleted ? "已返回" : "失败";

  return (
    <div className="rounded-xl border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(248,250,252,1))] px-3 py-2.5 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            <Wrench className="h-3 w-3" />
            Tool
          </div>
          <div
            className={cn(
              "break-words font-mono text-[12px] text-slate-900",
              isRunning && "animate-pulse",
            )}
          >
            {message.content}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              isRunning && "bg-sky-100 text-sky-700",
              isCompleted && "bg-emerald-100 text-emerald-700",
              isFailed && "bg-rose-100 text-rose-700",
            )}
          >
            {statusLabel}
          </div>
          {hasOutput && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800"
              aria-label={isExpanded ? "收起工具结果" : "展开工具结果"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded ? (
        <>
          {message.taskDetail && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {message.taskDetail}
            </div>
          )}

          {message.taskResult && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Result
              </div>
              <pre className="custom-scrollbar max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
                {message.taskResult}
              </pre>
            </div>
          )}
        </>
      ) : null}

      {isRunning && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
        </div>
      )}
    </div>
  );
}

function UserInteractionCard({ message }: { message: ChatMessage }) {
  const isAsk = message.kind === "ask";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-sm",
        isAsk
          ? "border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,247,237,1))]"
          : "border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1))]",
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
          isAsk ? "text-amber-700" : "text-slate-600",
        )}
      >
        {isAsk ? <CircleHelp className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
        {isAsk ? "Need Reply" : "Notice"}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {message.content}
      </div>
    </div>
  );
}

function WaveDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
    </span>
  );
}

export function ChatMessageList({
  messages,
  isStreaming = false,
}: ChatMessageListProps) {
  const visibleMessages = messages.filter((message) => message.kind !== "task");

  if (visibleMessages.length === 0) {
    return null;
  }

  const hasStreamingAssistantText = visibleMessages.some(
    (message) =>
      message.role === "assistant" &&
      (message.kind === "text" || !message.kind) &&
      message.isStreaming,
  );

  return (
    <Conversation className="custom-scrollbar flex-1">
      <ConversationContent className="mx-auto w-full max-w-[776px]">
        {visibleMessages.map((message) => {
          const isUser = message.role === "user";
          const isToolMessage = message.kind === "tool";
          const isInfoMessage =
            message.kind === "ask" || message.kind === "notify";
          const isSpecialMessage = isToolMessage || isInfoMessage;

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={cn(
                  "whitespace-pre-wrap",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted",
                  !isUser && !isSpecialMessage && "rounded-lg px-4 py-3",
                  isSpecialMessage && "bg-transparent p-0",
                )}
              >
                {isUser ? (
                  message.content
                ) : isToolMessage ? (
                  <ToolMessageCard message={message} />
                ) : isInfoMessage ? (
                  <UserInteractionCard message={message} />
                ) : (
                  <div>
                    <Response isStreaming={message.isStreaming}>
                      {message.content}
                    </Response>
                    {message.isStreaming ? (
                      <WaveDots className="ml-1 align-middle" />
                    ) : null}
                  </div>
                )}
              </MessageContent>
            </Message>
          );
        })}
        {isStreaming && !hasStreamingAssistantText ? (
          <Message from="assistant">
            <MessageContent className="rounded-lg bg-muted px-4 py-3">
              <WaveDots />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export type { ChatMessage };
