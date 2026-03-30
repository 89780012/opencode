import { useEffect, useMemo } from "react";
import { chatApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSessionTodos } from "@/store/chat-session-slice";
import type { ChatTodo } from "@/types/chat";

const empty: ChatTodo[] = [];
function done(list: { status: string }[]) {
  return list.length > 0 && list.every((item) => item.status === "completed" || item.status === "cancelled");
}

function pick(list: { content: string; status: string }[]) {
  return (
    list.find((item) => item.status === "in_progress") ??
    list.find((item) => item.status === "pending") ??
    [...list].reverse().find((item) => item.status === "completed") ??
    list[0]
  );
}

export function useChatTodo(
  workspacePath?: string | null,
  sessionId?: string | null,
  live = false,
) {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) =>
    sessionId ? state.chatSession.todos[sessionId] : undefined,
  );
  const list = data ?? empty;

  useEffect(() => {
    if (!workspacePath || !sessionId) {
      return;
    }
    if (data !== undefined) {
      return;
    }

    let dead = false;

    chatApi
      .getSessionTodos(workspacePath, sessionId)
      .catch(() => [] as ChatTodo[])
      .then((data) => {
        if (dead) {
          return;
        }
        dispatch(setSessionTodos({ sessionId, todos: data }));
      });

    return () => {
      dead = true;
    };
  }, [data, dispatch, sessionId, workspacePath]);

  const complete = useMemo(() => done(list), [list]);
  const item = useMemo(() => pick(list), [list]);

  return useMemo(
    () => ({
      todos: list,
      loading: !!workspacePath && !!sessionId && data === undefined,
      done: complete,
      visible: list.length > 0,
      collapsed: !live || complete,
      preview: item?.content ?? "",
    }),
    [complete, data, item?.content, list, live, sessionId, workspacePath],
  );
}
