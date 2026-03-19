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
  const err = useAppSelector((state) =>
    sessionId ? state.chatSession.errs[sessionId] : undefined,
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

  return useMemo(
    () => ({
      messages: view,
      status,
      err,
      loading,
      refresh,
    }),
    [err, loading, refresh, status, view],
  );
}
