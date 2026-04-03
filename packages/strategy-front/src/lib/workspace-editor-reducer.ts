import type { WorkspaceFileContentResponse } from "@/types/workspace"

type State = {
  ws: string
  loading: boolean
  error: string | null
  paths: string[]
  files: Record<string, WorkspaceFileContentResponse>
  drafts: Record<string, string>
  dirty: Record<string, boolean>
  open: string[]
  active: string | null
  busy: Record<string, boolean>
  saving: Record<string, boolean>
  errs: Record<string, string | null>
}

type Action =
  | { type: "load_start"; ws: string; reset: boolean }
  | { type: "files_loaded"; ws: string; paths: string[]; active: string | null; force: boolean }
  | { type: "load_failed"; ws: string; error: string }
  | { type: "tab_opened"; path: string }
  | { type: "active_set"; path: string | null }
  | { type: "tab_closed"; path: string }
  | { type: "file_load_started"; path: string }
  | { type: "file_load_succeeded"; path: string; data: WorkspaceFileContentResponse }
  | { type: "file_load_failed"; path: string; error: string }
  | { type: "draft_changed"; path: string; value: string }
  | { type: "save_started"; path: string }
  | { type: "save_succeeded"; path: string; data: WorkspaceFileContentResponse }
  | { type: "save_failed"; path: string; error: string }

function pick<T>(map: Record<string, T>, seen: Set<string>, keep?: (path: string) => boolean) {
  return Object.fromEntries(
    Object.entries(map).filter(([path]) => seen.has(path) && (!keep || keep(path))),
  ) as Record<string, T>
}

export function init(ws: string): State {
  return {
    ws,
    loading: false,
    error: null,
    paths: [],
    files: {},
    drafts: {},
    dirty: {},
    open: [],
    active: null,
    busy: {},
    saving: {},
    errs: {},
  }
}

export function reduce(state: State, action: Action): State {
  if (action.type === "load_start") {
    if (!action.reset) {
      return {
        ...state,
        loading: true,
        error: null,
      }
    }

    return {
      ...init(action.ws),
      loading: true,
    }
  }

  if (action.type === "files_loaded") {
    const seen = new Set(action.paths)
    if (state.ws !== action.ws) {
      return state
    }

    if (action.active !== null || state.paths.length === 0) {
      return {
        ...state,
        loading: false,
        error: null,
        paths: action.paths,
        files: {},
        drafts: {},
        dirty: {},
        open: action.active ? [action.active] : [],
        active: action.active,
        busy: {},
        saving: {},
        errs: {},
      }
    }

    const open = state.open.filter((path) => seen.has(path))
    const active = state.active && seen.has(state.active) ? state.active : (open[0] ?? null)
    const keep = (path: string) => !action.force || !!state.dirty[path]

    return {
      ...state,
      loading: false,
      error: null,
      paths: action.paths,
      files: pick(state.files, seen, keep),
      drafts: pick(state.drafts, seen, keep),
      dirty: pick(state.dirty, seen, (path) => !!state.dirty[path]),
      open,
      active,
      busy: pick(state.busy, seen),
      saving: pick(state.saving, seen),
      errs: pick(state.errs, seen, keep),
    }
  }

  if (action.type === "load_failed") {
    if (state.ws !== action.ws) {
      return state
    }
    return {
      ...init(action.ws),
      error: action.error,
    }
  }

  if (action.type === "tab_opened") {
    return {
      ...state,
      open: state.open.includes(action.path) ? state.open : [...state.open, action.path],
      active: action.path,
    }
  }

  if (action.type === "active_set") {
    return {
      ...state,
      active: action.path,
    }
  }

  if (action.type === "tab_closed") {
    const at = state.open.indexOf(action.path)
    const open = state.open.filter((item) => item !== action.path)
    if (state.active === action.path) {
      return {
        ...state,
        open,
        active: state.open[at + 1] ?? state.open[at - 1] ?? null,
      }
    }
    if (state.active && !open.includes(state.active)) {
      return {
        ...state,
        open,
        active: open[0] ?? null,
      }
    }
    return {
      ...state,
      open,
    }
  }

  if (action.type === "file_load_started") {
    return {
      ...state,
      busy: {
        ...state.busy,
        [action.path]: true,
      },
      errs: {
        ...state.errs,
        [action.path]: null,
      },
    }
  }

  if (action.type === "file_load_succeeded") {
    return {
      ...state,
      files: {
        ...state.files,
        [action.path]: action.data,
      },
      drafts: action.path in state.drafts ? state.drafts : { ...state.drafts, [action.path]: action.data.content },
      busy: {
        ...state.busy,
        [action.path]: false,
      },
    }
  }

  if (action.type === "file_load_failed") {
    return {
      ...state,
      busy: {
        ...state.busy,
        [action.path]: false,
      },
      errs: {
        ...state.errs,
        [action.path]: action.error,
      },
    }
  }

  if (action.type === "draft_changed") {
    return {
      ...state,
      drafts: {
        ...state.drafts,
        [action.path]: action.value,
      },
      dirty: {
        ...state.dirty,
        [action.path]: action.value !== (state.files[action.path]?.content ?? ""),
      },
    }
  }

  if (action.type === "save_started") {
    return {
      ...state,
      saving: {
        ...state.saving,
        [action.path]: true,
      },
      errs: {
        ...state.errs,
        [action.path]: null,
      },
    }
  }

  if (action.type === "save_succeeded") {
    return {
      ...state,
      files: {
        ...state.files,
        [action.path]: action.data,
      },
      drafts: {
        ...state.drafts,
        [action.path]: action.data.content,
      },
      dirty: {
        ...state.dirty,
        [action.path]: false,
      },
      saving: {
        ...state.saving,
        [action.path]: false,
      },
    }
  }

  return {
    ...state,
    saving: {
      ...state.saving,
      [action.path]: false,
    },
    errs: {
      ...state.errs,
      [action.path]: action.error,
    },
  }
}
