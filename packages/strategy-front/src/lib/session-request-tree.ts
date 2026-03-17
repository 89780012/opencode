import type { ChatQuestionRequest, ChatSessionSummary, PermissionRequest } from "@/types/chat";

function tree<T>(
  sessions: ChatSessionSummary[],
  req: Record<string, T[] | undefined>,
  sessionID?: string | null,
) {
  if (!sessionID) return;

  const map = sessions.reduce((acc, item) => {
    if (!item.parentID) return acc;
    const list = acc.get(item.parentID) ?? [];
    list.push(item.id);
    acc.set(item.parentID, list);
    return acc;
  }, new Map<string, string[]>());

  const seen = new Set([sessionID]);
  const ids = [sessionID];
  for (const id of ids) {
    const list = map.get(id) ?? [];
    list.forEach((child) => {
      if (seen.has(child)) return;
      seen.add(child);
      ids.push(child);
    });
  }

  const hit = ids.find((id) => (req[id]?.length ?? 0) > 0);
  if (!hit) return;
  return req[hit]?.[0];
}

export function sessionQuestionRequest(
  sessions: ChatSessionSummary[],
  req: Record<string, ChatQuestionRequest[] | undefined>,
  sessionID?: string | null,
) {
  return tree(sessions, req, sessionID);
}

export function sessionPermissionRequest(
  sessions: ChatSessionSummary[],
  req: Record<string, PermissionRequest[] | undefined>,
  sessionID?: string | null,
  include: (item: PermissionRequest) => boolean = () => true,
) {
  if (!sessionID) return;
  const map = sessions.reduce((acc, item) => {
    if (!item.parentID) return acc;
    const list = acc.get(item.parentID) ?? [];
    list.push(item.id);
    acc.set(item.parentID, list);
    return acc;
  }, new Map<string, string[]>());

  const seen = new Set([sessionID]);
  const ids = [sessionID];
  for (const id of ids) {
    const list = map.get(id) ?? [];
    list.forEach((child) => {
      if (seen.has(child)) return;
      seen.add(child);
      ids.push(child);
    });
  }

  const hit = ids.find((id) => req[id]?.some(include));
  if (!hit) return;
  return req[hit]?.find(include);
}
