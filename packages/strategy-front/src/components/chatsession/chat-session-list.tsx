"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";

import { useChatSessions } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";
import type { ChatSessionSummary } from "@/types/chat";

interface ChatSessionGroup {
  title: string;
  sessions: ChatSessionSummary[];
}

/** 按更新时间把会话分组为“今天 / 昨天 / 7天内 / 更早”。 */
function groupSessionsByTime(sessions: ChatSessionSummary[]): ChatSessionGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sevenDaysAgo = new Date(today.getTime() - 86400000 * 7);

  const groups: Record<string, ChatSessionSummary[]> = {
    今天: [],
    昨天: [],
    "7天内": [],
    更早: [],
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.updated_at);
    if (sessionDate >= today) {
      groups["今天"].push(session);
    } else if (sessionDate >= yesterday) {
      groups["昨天"].push(session);
    } else if (sessionDate >= sevenDaysAgo) {
      groups["7天内"].push(session);
    } else {
      groups["更早"].push(session);
    }
  });

  return Object.entries(groups)
    .filter((entry) => entry[1].length > 0)
    .map(([title, sessions]) => ({ title, sessions }));
}

type ChatSessionListProps = {
  loading?: boolean;
};

export function ChatSessionList({ loading = false }: ChatSessionListProps) {
  const { sessions, selectedSessionId, selectSession, streamingSessionIds } =
    useChatSessions();

  /** 仅在会话列表变化时重新计算时间分组。 */
  const groups = React.useMemo(
    () => groupSessionsByTime(sessions),
    [sessions],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-1 custom-scrollbar">
      {groups.length === 0 && !loading ? (
        <div className="px-2 py-4 text-xs text-muted-foreground">
          暂无会话，点击上方按钮创建。
        </div>
      ) : null}
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <span className="px-2 py-1 text-xs text-muted-foreground">
            {group.title}
          </span>
          {group.sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedSessionId === session.id &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <MessageSquare className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{session.title}</span>
              {streamingSessionIds.includes(session.id) ? (
                <span className="shrink-0 rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[10px] font-medium text-[#1D4ED8]">
                  生成中
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
      {loading && (
        <div className="flex justify-center py-2">
          <span className="text-xs text-muted-foreground">加载中...</span>
        </div>
      )}
    </div>
  );
}
