import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { permissionApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { sessionPermissionRequest } from "@/lib/session-request-tree";
import { applyWorkspaceEvent, setPendingPermissions } from "@/store/chat-session-slice";
import type { PermissionRequest } from "@/types/chat";

export function useChatPermission(
  workspacePath?: string | null,
  sessionID?: string | null,
  accepting?: boolean,
  refresh?: (sessionId?: string | null) => Promise<void>,
) {
  const dispatch = useAppDispatch();
  const [sending, setSending] = useState(false);
  const sent = useRef(new Set<string>());
  const sessions = useAppSelector((state) =>
    workspacePath ? (state.chatSession.sessions[workspacePath] ?? []) : [],
  );
  const reqs = useAppSelector((state) => state.chatSession.permissions);

  const pull = useCallback(async () => {
    const data = await permissionApi.list().catch(() => [] as PermissionRequest[]);
    dispatch(setPendingPermissions({ items: data }));
  }, [dispatch]);

  useEffect(() => {
    if (!workspacePath) return;
    void pull();
  }, [pull, workspacePath]);

  useEffect(() => {
    if (!workspacePath || !accepting) return;
    void pull();
  }, [accepting, pull, workspacePath]);

  const req = useMemo(
    () => sessionPermissionRequest(sessions, reqs, sessionID),
    [reqs, sessionID, sessions],
  );

  const respond = useCallback(async (item: PermissionRequest, response: "once" | "always" | "reject") => {
    if (!workspacePath || sending) return;
    setSending(true);
    try {
      await permissionApi.respond(item.sessionID, item.id, { response });
      sent.current.add(item.id);
      dispatch(
        applyWorkspaceEvent({
          workspace: workspacePath,
          event: {
            type: "permission.replied",
            properties: {
              sessionID: item.sessionID,
              requestID: item.id,
              reply: response,
            },
          },
        }),
      );
      await Promise.all([
        refresh?.(item.sessionID),
        pull(),
      ]);
    } finally {
      setSending(false);
    }
  }, [dispatch, pull, refresh, sending, workspacePath]);

  const allow = useCallback(async (response: "once" | "always" | "reject") => {
    if (!req) return;
    await respond(req, response);
  }, [req, respond]);

  useEffect(() => {
    if (!workspacePath || !accepting || sending) return;
    const ids = new Set(sessions.map((item) => item.id));
    const list = Object.values(reqs)
      .flatMap((item) => item ?? [])
      .filter((item) => ids.has(item.sessionID))
      .filter((item) => !sent.current.has(item.id));
    if (list.length === 0) return;
    void Promise.all(list.map((item) => respond(item, "once")));
  }, [accepting, reqs, respond, sending, sessions, workspacePath]);

  return {
    req,
    sending,
    allow,
    refresh: pull,
  };
}
