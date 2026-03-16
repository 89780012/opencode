import { useCallback, useEffect, useState } from "react";

import { chatApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  setChatSessions,
  setChatSessionStreaming,
  setSelectedChatSession,
  upsertChatSession,
} from "@/store/chat-session-slice";
import type { ChatSessionSummary } from "@/types/chat";

// 是否自动加载
interface UseChatSessionsOptions {
  autoLoad?: boolean;
}

interface UseChatSessionsResult {
  sessions: ChatSessionSummary[];
  selectedSessionId: string | null;
  streamingSessionIds: string[];
  loading: boolean;
  creating: boolean;
  refreshSessions: () => Promise<void>;
  createSession: () => Promise<ChatSessionSummary>;
  selectSession: (sessionId: string | null) => void;
  setSessionStreaming: (sessionId: string, isStreaming: boolean) => void;
}

export function useChatSessions(
  options: UseChatSessionsOptions = {},
): UseChatSessionsResult {
  const { autoLoad = false } = options;
  const dispatch = useAppDispatch();
  const sessions = useAppSelector((state) => state.chatSession.sessions);
  const selectedSessionId = useAppSelector(
    (state) => state.chatSession.selectedSessionId,
  );
  const streamingSessionIds = useAppSelector(
    (state) => state.chatSession.streamingSessionIds,
  );
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  /**
   * 刷新会话列表。
   * 当当前没有选中的会话时，自动选中列表中的第一项。
   */
  const refreshSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatApi.listSessions();
      dispatch(setChatSessions(data.sessions));

      if (!selectedSessionId && data.sessions.length > 0) {
        dispatch(setSelectedChatSession(data.sessions[0].id));
      }
    } catch (error) {
      console.error("Failed to load chat sessions", error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedSessionId]);

  /** 首次进入页面时自动加载会话列表。 */
  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void refreshSessions();
  }, [autoLoad, refreshSessions]);

  /**
   * 创建新会话。
   * 创建成功后会把会话写入全局状态，并切换为当前选中会话。
   */
  const createSession = useCallback(async () => {
    setCreating(true);
    try {
      const session = await chatApi.createSession();
      dispatch(upsertChatSession(session));
      dispatch(setSelectedChatSession(session.id));
      return session;
    } finally {
      setCreating(false);
    }
  }, [dispatch]);

  /** 手动切换当前选中的会话。 */
  const selectSession = useCallback(
    (sessionId: string | null) => {
      dispatch(setSelectedChatSession(sessionId));
    },
    [dispatch],
  );

  const setSessionStreaming = useCallback(
    (sessionId: string, isStreaming: boolean) => {
      dispatch(setChatSessionStreaming({ sessionId, isStreaming }));
    },
    [dispatch],
  );

  return {
    sessions,
    selectedSessionId,
    streamingSessionIds,
    loading,
    creating,
    refreshSessions,
    createSession,
    selectSession,
    setSessionStreaming,
  };
}
