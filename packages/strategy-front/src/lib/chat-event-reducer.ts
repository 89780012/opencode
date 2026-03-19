import type {
  ChatEvent,
  ChatMessageInfo,
  ChatMessageRecord,
  ChatPart,
  PermissionRequest,
  ChatQuestionRequest,
  ChatSessionSummary,
  ChatStatus,
} from "@/types/chat";

export type ChatStateShape = {
  sessions: Record<string, ChatSessionSummary[]>;
  selected: Record<string, string | null>;
  messages: Record<string, ChatMessageInfo[]>;
  parts: Record<string, ChatPart[]>;
  permissions: Record<string, PermissionRequest[]>;
  questions: Record<string, ChatQuestionRequest[]>;
  status: Record<string, ChatStatus>;
  errs: Record<string, string | undefined>;
};

const idle: ChatStatus = { type: "idle" };

const sortSession = (list: ChatSessionSummary[]) =>
  [...list].sort((a, b) => b.time.updated - a.time.updated);

const sortMsg = (list: ChatMessageInfo[]) =>
  [...list].sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id));

const sortPart = (list: ChatPart[]) =>
  [...list].sort((a, b) => a.id.localeCompare(b.id));

const msgErr = (err?: { data?: Record<string, unknown> }) => {
  const txt = err?.data?.message;
  return typeof txt === "string" && txt ? txt : undefined;
};

function add(part: ChatPart, field: string, delta: string) {
  if (field === "text" && "text" in part) {
    part.text += delta;
    return;
  }
  if (field === "snapshot" && "snapshot" in part) {
    part.snapshot += delta;
    return;
  }
  if (field === "prompt" && "prompt" in part) {
    part.prompt += delta;
    return;
  }
  if (field === "description" && "description" in part) {
    part.description += delta;
    return;
  }
  if (field === "name" && "name" in part) {
    part.name += delta;
  }
}

function arraysShallowEqual<T extends { id: string }>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && a[i].id !== b[i].id) return false;
  }
  return true;
}

export function hydrateChat(state: ChatStateShape, sessionID: string, list: ChatMessageRecord[]) {
  const nextMessages = sortMsg(list.map((item) => item.info));
  const prevMessages = state.messages[sessionID];
  if (!prevMessages || !arraysShallowEqual(prevMessages, nextMessages)) {
    state.messages[sessionID] = nextMessages;
  }

  list.forEach((item) => {
    const nextParts = sortPart(item.parts);
    const prevParts = state.parts[item.info.id];
    if (!prevParts || !arraysShallowEqual(prevParts, nextParts)) {
      state.parts[item.info.id] = nextParts;
    }
    if (item.info.role !== "assistant") return;
    const err = msgErr(item.info.error);
    if (!err) return;
    state.errs[sessionID] = err;
  });
  if (!state.status[sessionID]) {
    state.status[sessionID] = idle;
  }
}

export function hydrateQuestions(state: ChatStateShape, list: ChatQuestionRequest[]) {
  state.questions = {};
  list.forEach((item) => {
    const cur = state.questions[item.sessionID] ?? [];
    state.questions[item.sessionID] = [...cur, item].sort((a, b) => a.id.localeCompare(b.id));
  });
}

export function hydratePermissions(state: ChatStateShape, list: PermissionRequest[]) {
  state.permissions = {};
  list.forEach((item) => {
    const cur = state.permissions[item.sessionID] ?? [];
    state.permissions[item.sessionID] = [...cur, item].sort((a, b) => a.id.localeCompare(b.id));
  });
}

export function upsertSession(state: ChatStateShape, workspace: string, info: ChatSessionSummary) {
  const list = state.sessions[workspace] ?? [];
  const next = list.some((item) => item.id === info.id)
    ? list.map((item) => (item.id === info.id ? info : item))
    : [...list, info];
  state.sessions[workspace] = sortSession(next);
}

export function removeSession(state: ChatStateShape, workspace: string, info: ChatSessionSummary) {
  const list = state.sessions[workspace] ?? [];
  state.sessions[workspace] = list.filter((item) => item.id !== info.id);
  if (state.selected[workspace] === info.id) {
    state.selected[workspace] = null;
  }
  delete state.messages[info.id];
  delete state.status[info.id];
  delete state.errs[info.id];
  delete state.permissions[info.id];
  delete state.questions[info.id];
}

export function applyChatEvent(state: ChatStateShape, workspace: string, evt: ChatEvent) {
  switch (evt.type) {
    case "session.created":
    case "session.updated": {
      upsertSession(state, workspace, evt.properties.info);
      return;
    }
    case "session.deleted": {
      removeSession(state, workspace, evt.properties.info);
      return;
    }
    case "permission.asked": {
      const req = evt.properties;
      const list = state.permissions[req.sessionID] ?? [];
      const next = list.some((item) => item.id === req.id)
        ? list.map((item) => (item.id === req.id ? req : item))
        : [...list, req];
      state.permissions[req.sessionID] = next.sort((a, b) => a.id.localeCompare(b.id));
      return;
    }
    case "permission.replied": {
      const list = state.permissions[evt.properties.sessionID] ?? [];
      const next = list.filter((item) => item.id !== evt.properties.requestID);
      if (next.length === 0) {
        delete state.permissions[evt.properties.sessionID];
        return;
      }
      state.permissions[evt.properties.sessionID] = next;
      return;
    }
    case "session.status": {
      state.status[evt.properties.sessionID] = evt.properties.status;
      return;
    }
    case "session.idle": {
      state.status[evt.properties.sessionID] = idle;
      return;
    }
    case "session.error": {
      if (!evt.properties.sessionID) return;
      state.errs[evt.properties.sessionID] = msgErr(evt.properties.error) ?? "Request failed";
      return;
    }
    case "message.updated": {
      const info = evt.properties.info;
      const list = state.messages[info.sessionID] ?? [];
      const next = list.some((item) => item.id === info.id)
        ? list.map((item) => (item.id === info.id ? info : item))
        : [...list, info];
      state.messages[info.sessionID] = sortMsg(next);
      if (info.role !== "assistant") return;
      const err = msgErr(info.error);
      if (!err) return;
      state.errs[info.sessionID] = err;
      return;
    }
    case "message.removed": {
      const list = state.messages[evt.properties.sessionID] ?? [];
      state.messages[evt.properties.sessionID] = list.filter((item) => item.id !== evt.properties.messageID);
      delete state.parts[evt.properties.messageID];
      return;
    }
    case "message.part.updated": {
      const part = evt.properties.part;
      const list = state.parts[part.messageID] ?? [];
      const next = list.some((item) => item.id === part.id)
        ? list.map((item) => (item.id === part.id ? part : item))
        : [...list, part];
      state.parts[part.messageID] = sortPart(next);
      return;
    }
    case "message.part.removed": {
      const list = state.parts[evt.properties.messageID] ?? [];
      const next = list.filter((item) => item.id !== evt.properties.partID);
      if (next.length === 0) {
        delete state.parts[evt.properties.messageID];
        return;
      }
      state.parts[evt.properties.messageID] = next;
      return;
    }
    case "message.part.delta": {
      const list = state.parts[evt.properties.messageID];
      if (!list) return;
      const idx = list.findIndex((item) => item.id === evt.properties.partID);
      if (idx < 0) return;
      add(list[idx], evt.properties.field, evt.properties.delta);
      return;
    }
    case "question.asked": {
      const req = evt.properties;
      const list = state.questions[req.sessionID] ?? [];
      const next = list.some((item) => item.id === req.id)
        ? list.map((item) => (item.id === req.id ? req : item))
        : [...list, req];
      state.questions[req.sessionID] = next.sort((a, b) => a.id.localeCompare(b.id));
      return;
    }
    case "question.replied":
    case "question.rejected": {
      const list = state.questions[evt.properties.sessionID] ?? [];
      const next = list.filter((item) => item.id !== evt.properties.requestID);
      if (next.length === 0) {
        delete state.questions[evt.properties.sessionID];
        return;
      }
      state.questions[evt.properties.sessionID] = next;
      return;
    }
  }
}
