import { useCallback, useEffect, useMemo, useState } from "react";
import { questionApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { sessionQuestionRequest } from "@/lib/session-request-tree";
import { setPendingQuestions } from "@/store/chat-session-slice";
import type { ChatQuestionAnswer } from "@/types/chat";

export function useChatQuestion(workspacePath?: string | null, sessionID?: string | null) {
  const dispatch = useAppDispatch();
  const [sending, setSending] = useState(false);
  const sessions = useAppSelector((state) =>
    workspacePath ? (state.chatSession.sessions[workspacePath] ?? []) : [],
  );
  const reqs = useAppSelector((state) => state.chatSession.questions);

  const pull = useCallback(async () => {
    if (!workspacePath) return;
    const data = await questionApi.list(workspacePath).catch(() => []);
    dispatch(setPendingQuestions({ items: data }));
  }, [dispatch, workspacePath]);

  useEffect(() => {
    if (!workspacePath) return;
    let dead = false;
    const run = async () => {
      const data = await questionApi.list(workspacePath).catch(() => []);
      if (dead) return;
      dispatch(setPendingQuestions({ items: data }));
    };
    void run();
    return () => {
      dead = true;
    };
  }, [dispatch, workspacePath]);

  const req = useMemo(
    () => sessionQuestionRequest(sessions, reqs, sessionID),
    [reqs, sessionID, sessions],
  );

  const reply = useCallback(async (answers: ChatQuestionAnswer[]) => {
    if (!req || !workspacePath || sending) return;
    setSending(true);
    try {
      await questionApi.reply(workspacePath, req.id, answers);
      await pull();
    } finally {
      setSending(false);
    }
  }, [pull, req, sending, workspacePath]);

  const reject = useCallback(async () => {
    if (!req || !workspacePath || sending) return;
    setSending(true);
    try {
      await questionApi.reject(workspacePath, req.id);
      await pull();
    } finally {
      setSending(false);
    }
  }, [pull, req, sending, workspacePath]);

  return {
    req,
    sending,
    reply,
    reject,
  };
}
