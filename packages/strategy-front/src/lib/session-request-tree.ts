import type { ChatQuestionRequest, ChatSessionSummary, PermissionRequest } from "@/types/chat";

function descendants(sessions: ChatSessionSummary[], sessionID?: string | null) {
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

  return ids;
}

function tree<T>(
  sessions: ChatSessionSummary[],
  req: Record<string, T[] | undefined>,
  sessionID?: string | null,
  include: (item: T) => boolean = () => true,
) {
  const ids = descendants(sessions, sessionID);
  if (!ids) return;

  const hit = ids.find((id) => req[id]?.some(include));
  if (!hit) return;
  return req[hit]?.find(include);
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
  return tree(sessions, req, sessionID, include);
}
