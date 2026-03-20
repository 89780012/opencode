import { useCallback, useEffect, useMemo, useState } from "react";
import { permissionApi } from "@/api/modules";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { sessionPermissionRequest } from "@/lib/session-request-tree";
import { applyWorkspaceEvent, setPendingPermissions } from "@/store/chat-session-slice";
import type { PermissionRequest } from "@/types/chat";

export function useChatPermission(
  workspacePath?: string | null,
  sessionID?: string | null,
) {
  const dispatch = useAppDispatch();
  const [sending, setSending] = useState(false);
  const sessions = useAppSelector((state) =>
    workspacePath ? (state.chatSession.sessions[workspacePath] ?? []) : [],
  );
  const reqs = useAppSelector((state) => state.chatSession.permissions);

  const pull = useCallback(async () => {
    if (!workspacePath) return;
    const data = await permissionApi.list(workspacePath).catch(() => [] as PermissionRequest[]);
    dispatch(setPendingPermissions({ items: data }));
  }, [dispatch, workspacePath]);

  useEffect(() => {
    if (!workspacePath) return;
    void pull();
  }, [pull, workspacePath]);

  const req = useMemo(
    () => sessionPermissionRequest(sessions, reqs, sessionID),
    [reqs, sessionID, sessions],
  );

  const respond = useCallback(async (item: PermissionRequest, response: "once" | "always" | "reject") => {
    if (!workspacePath || sending) return;
    setSending(true);
    try {
      await permissionApi.respond(workspacePath, item.id, { reply: response });
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
    } finally {
      setSending(false);
    }
  }, [dispatch, sending, workspacePath]);

  const allow = useCallback(async (response: "once" | "always" | "reject") => {
    if (!req) return;
    await respond(req, response);
  }, [req, respond]);

  return {
    req,
    sending,
    allow,
    refresh: pull,
  };
}
