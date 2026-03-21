import { useCallback, useEffect, useMemo, useState } from "react";
import { chatApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { idle } from "@/lib/chat-event-reducer";
import { hydrateSessionMessages } from "@/store/chat-session-slice";
import type { ChatMessageInfo, ChatView } from "@/types/chat";

const emptyMessages: ChatMessageInfo[] = [];

export function useChatSessionDetail(
  workspacePath?: string | null,
  sessionId?: string | null,
) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) =>
    sessionId ? (state.chatSession.messages[sessionId] ?? emptyMessages) : emptyMessages,
  );
  const parts = useAppSelector((state) => state.chatSession.parts);
  const status = useAppSelector((state) =>
    sessionId ? (state.chatSession.status[sessionId] ?? idle) : idle,
  );
  const messageErr = useAppSelector((state) =>
    sessionId ? state.chatSession.messageErrs[sessionId] : undefined,
  );
  const rawEventErr = useAppSelector((state) =>
    sessionId ? state.chatSession.eventErrs[sessionId] : undefined,
  );
  const [loading, setLoading] = useState(false);

  const hasCache = messages.length > 0;

  const refresh = useCallback(async (target?: string | null) => {
    const id = target ?? sessionId;
    if (!workspacePath || !id) {
      return;
    }
    try {
      const data = await chatApi.getSessionMessages(workspacePath, id);
      dispatch(hydrateSessionMessages({ sessionId: id, records: data }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, sessionId, workspacePath]);

  useEffect(() => {
    if (!workspacePath || !sessionId) {
      return;
    }
    if (!hasCache) {
      setLoading(true);
    }
    void refresh(sessionId);
  }, [refresh, sessionId, workspacePath, hasCache]);

  const view = useMemo<ChatView[]>(
    () =>
      messages.map((info) => ({
        info,
        parts: parts[info.id] ?? [],
      })),
    [messages, parts],
  );

  // 一旦错误已经落进 AI 历史消息，就只显示历史里的那条，避免再叠加一条事件红框。
  const eventErr = messageErr ? undefined : rawEventErr;

  return useMemo(
    () => ({
      messages: view,
      status,
      err: eventErr ?? messageErr,
      eventErr,
      messageErr,
      loading,
      refresh,
    }),
    [eventErr, loading, messageErr, refresh, status, view],
  );
}
