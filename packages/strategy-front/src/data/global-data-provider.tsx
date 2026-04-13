import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react"
import { agentApi, mcpApi, providerApi, skillApi, workspaceApi } from "@/api/modules"
import { rankAgent } from "@/lib/chat-composer"
import { latestModels, modelVisible, readModelVisibility } from "@/lib/model-catalog"
import type { GlobalAgentCatalog, RuntimeAgent } from "@/types/agent"
import type { ComposerModel, ProviderCatalogState } from "@/types/composer"
import type { McpDoc, McpMap } from "@/types/mcp"
import type { AuthMap, Config, List } from "@/types/provider"
import type { GlobalSkillCatalog, RuntimeSkill } from "@/types/skill"
import type { LocalWorkspace } from "@/types/workspace"

type Key = "agent" | "provider" | "mcp" | "skill" | "workspace"

type Box<T> = {
  data: T
  err: string
  load: boolean
  ready: boolean
  stale: boolean
  stamp: number
}

type AgentData = {
  run: RuntimeAgent[]
  cfg: GlobalAgentCatalog
}

type ProviderData = ProviderCatalogState & {
  auth: AuthMap
}

type McpData = {
  doc: McpDoc
  map: McpMap
}

type SkillData = {
  run: RuntimeSkill[]
  cfg: GlobalSkillCatalog
}

type WorkspaceData = {
  basePath: string
  workspaces: LocalWorkspace[]
}

type DataMap = {
  agent: AgentData
  provider: ProviderData
  mcp: McpData
  skill: SkillData
  workspace: WorkspaceData
}

type State = {
  agent: Box<AgentData>
  provider: Box<ProviderData>
  mcp: Box<McpData>
  skill: Box<SkillData>
  workspace: Box<WorkspaceData>
}

type Action =
  | { type: "load_start"; key: Key }
  | { type: "load_done"; key: Key; box: Box<DataMap[Key]> }
  | { type: "invalidate"; key: Key }

type Ctx = State & {
  ensure: <K extends Key>(key: K) => Promise<Box<DataMap[K]>>
  refresh: <K extends Key>(key: K) => Promise<Box<DataMap[K]>>
  refreshMany: (keys: Key[]) => Promise<void>
  invalidate: (key: Key) => void
  syncProvider: () => void
  clearWorkspace: () => void
  selectWorkspace: (item: LocalWorkspace) => void
  workspace: State["workspace"] & {
    selected: LocalWorkspace | null
  }
}

type Out<T> = {
  data: T
  err: string
}

const emptyAgent: AgentData = {
  run: [],
  cfg: {
    root: "",
    agents: [],
  },
}

const emptyProvider: ProviderData = {
  providers: {
    all: [],
    connected: [],
    default: {},
  },
  config: {},
  auth: {},
  connectedModels: [],
  visibleModels: [],
}

const emptyMcp: McpData = {
  doc: {},
  map: {},
}

const emptySkill: SkillData = {
  run: [],
  cfg: {
    root: "",
    skills: [],
  },
}

const emptyWorkspace: WorkspaceData = {
  basePath: "",
  workspaces: [],
}

const Ctx = createContext<Ctx | null>(null)

function item<T>(data: T): Box<T> {
  return {
    data,
    err: "",
    load: false,
    ready: false,
    stale: true,
    stamp: 0,
  }
}

function initState(): State {
  return {
    agent: item(emptyAgent),
    provider: item(emptyProvider),
    mcp: item(emptyMcp),
    skill: item(emptySkill),
    workspace: item(emptyWorkspace),
  }
}

function reduce(state: State, action: Action): State {
  if (action.type === "load_start") {
    return {
      ...state,
      [action.key]: {
        ...state[action.key],
        load: true,
      },
    }
  }

  if (action.type === "invalidate") {
    return {
      ...state,
      [action.key]: {
        ...state[action.key],
        stale: true,
      },
    }
  }

  return {
    ...state,
    [action.key]: action.box,
  }
}

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === "string" && err) {
    return err
  }

  return fallback
}

function normAgentCfg(input?: Partial<GlobalAgentCatalog> | null): GlobalAgentCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    agents: Array.isArray(input?.agents) ? input.agents : [],
  }
}

function normSkillCfg(input?: Partial<GlobalSkillCatalog> | null): GlobalSkillCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    skills: Array.isArray(input?.skills) ? input.skills : [],
  }
}

function normWorkspace(item: LocalWorkspace): LocalWorkspace {
  return {
    ...item,
    type:
      item.type === "smartx" || item.type === "python" || item.type === "js" || item.type === "other"
        ? item.type
        : undefined,
    template: typeof item.template === "string" ? item.template : undefined,
    entry_file: typeof item.entry_file === "string" ? item.entry_file : undefined,
    keywords: item.keywords ?? [],
    source:
      item.source === "default_plugin" ||
      item.source === "user_created" ||
      item.source === "imported" ||
      item.source === "external"
        ? item.source
        : undefined,
    managed: !!item.managed,
    missing: !!item.missing,
    updated_at: typeof item.updated_at === "number" ? item.updated_at : 0,
  }
}

function scope(value?: string) {
  return value?.trim().toLowerCase() || ""
}

function agentScope(name: string, cfg: GlobalAgentCatalog) {
  const item = cfg.agents.find((row) => row.name === name)
  if (item?.scope) {
    return scope(item.scope)
  }
  if (name === "strategy") {
    return "smartx"
  }
  return ""
}

function skillScope(name: string, cfg: GlobalSkillCatalog) {
  const item = cfg.skills.find((row) => row.name === name)
  if (item?.scope) {
    return scope(item.scope)
  }
  if (name === "strategy-service") {
    return "smartx"
  }
  return ""
}

function allow(item?: string, current?: string) {
  const row = scope(item)
  const cur = scope(current)
  if (!row || row === "all") {
    return true
  }
  return row === cur
}

function buildProvider(providers: List, config: Config, auth: AuthMap): ProviderData {
  const user = readModelVisibility()
  const connected = new Set(providers.connected)
  const connectedModels = providers.all
    .filter((item) => connected.has(item.id))
    .flatMap((provider) =>
      Object.values(provider.models).map(
        (model) =>
          ({
            ...model,
            provider,
          }) satisfies ComposerModel,
      ),
    )
  const latest = latestModels(connectedModels)
  const visibleModels = connectedModels.filter((item) =>
    modelVisible({
      row: item,
      user,
      latest,
      model: { providerID: item.provider.id, modelID: item.id },
    }),
  )

  return {
    providers,
    config,
    auth,
    connectedModels,
    visibleModels,
  }
}

async function loadAgent(): Promise<Out<AgentData>> {
  const [run, cfg] = await Promise.allSettled([agentApi.listRuntime(), agentApi.listGlobal()])
  const doc = cfg.status === "fulfilled" ? normAgentCfg(cfg.value) : emptyAgent.cfg

  return {
    data: {
      run:
        run.status === "fulfilled" && Array.isArray(run.value)
          ? run.value.map((item) => ({
              ...item,
              scope: agentScope(item.name, doc),
            }))
          : [],
      cfg: doc,
    },
    err: [
      ...(run.status === "rejected" ? [note(run.reason, "Failed to load agent runtime")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "Failed to load agent config")] : []),
    ]
      .filter(Boolean)
      .join("; "),
  }
}

async function loadProvider(): Promise<Out<ProviderData>> {
  const [providers, config, auth] = await Promise.allSettled([
    providerApi.list(),
    providerApi.config(),
    providerApi.auth(),
  ])

  const list = providers.status === "fulfilled" ? providers.value : emptyProvider.providers
  const cfg = config.status === "fulfilled" ? config.value : emptyProvider.config
  const map = auth.status === "fulfilled" ? auth.value : emptyProvider.auth

  return {
    data: buildProvider(list, cfg, map),
    err: [
      ...(providers.status === "rejected" ? [note(providers.reason, "Failed to load provider list")] : []),
      ...(config.status === "rejected" ? [note(config.reason, "Failed to load provider config")] : []),
      ...(auth.status === "rejected" ? [note(auth.reason, "Failed to load provider auth")] : []),
    ]
      .filter(Boolean)
      .join("; "),
  }
}

async function loadMcp(): Promise<Out<McpData>> {
  const [doc, map] = await Promise.allSettled([mcpApi.config(), mcpApi.status()])

  return {
    data: {
      doc: doc.status === "fulfilled" ? doc.value : emptyMcp.doc,
      map: map.status === "fulfilled" ? map.value : emptyMcp.map,
    },
    err: [
      ...(doc.status === "rejected" ? [note(doc.reason, "Failed to load MCP config")] : []),
      ...(map.status === "rejected" ? [note(map.reason, "Failed to load MCP status")] : []),
    ]
      .filter(Boolean)
      .join("; "),
  }
}

async function loadSkill(): Promise<Out<SkillData>> {
  const [run, cfg] = await Promise.allSettled([skillApi.listRuntime(), skillApi.listGlobal()])
  const doc = cfg.status === "fulfilled" ? normSkillCfg(cfg.value) : emptySkill.cfg

  return {
    data: {
      run:
        run.status === "fulfilled" && Array.isArray(run.value)
          ? run.value.map((item) => ({
              ...item,
              scope: skillScope(item.name, doc),
            }))
          : [],
      cfg: doc,
    },
    err: [
      ...(run.status === "rejected" ? [note(run.reason, "Failed to load skill runtime")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "Failed to load skill config")] : []),
    ]
      .filter(Boolean)
      .join("; "),
  }
}

async function loadWorkspace(): Promise<Out<WorkspaceData>> {
  try {
    const data = await workspaceApi.getLocalWorkspaces()
    return {
      data: {
        basePath: data.base_path,
        workspaces: (data.workspaces ?? []).map(normWorkspace),
      },
      err: "",
    }
  } catch (err) {
    return {
      data: emptyWorkspace,
      err: note(err, "Failed to load workspaces"),
    }
  }
}

export function GlobalDataProvider(props: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [state, dispatch] = useReducer(reduce, undefined, initState)
  const ref = useRef(state)
  const seq = useRef<Record<Key, number>>({
    agent: 0,
    provider: 0,
    mcp: 0,
    skill: 0,
    workspace: 0,
  })
  const wait = useRef<Partial<Record<Key, Promise<Box<DataMap[Key]>>>>>({})

  useEffect(() => {
    ref.current = state
  }, [state])

  const pull = useCallback(<K extends Key>(key: K, force: boolean) => {
    const cur = wait.current[key] as Promise<Box<DataMap[K]>> | undefined
    if (cur && !force) {
      return cur
    }

    const id = ++seq.current[key]
    dispatch({ type: "load_start", key })

    const task = (
      key === "agent"
        ? loadAgent()
        : key === "provider"
          ? loadProvider()
          : key === "mcp"
            ? loadMcp()
            : key === "skill"
              ? loadSkill()
              : loadWorkspace()
    )
      .then((out) => {
        const next = {
          data: out.data as DataMap[K],
          err: out.err,
          load: false,
          ready: true,
          stale: false,
          stamp: Date.now(),
        } satisfies Box<DataMap[K]>

        if (seq.current[key] === id) {
          dispatch({ type: "load_done", key, box: next as Box<DataMap[Key]> })
        }

        return next
      })
      .catch((err) => {
        const prev = ref.current[key] as Box<DataMap[K]>
        const next = {
          ...prev,
          err: note(err, `Failed to load ${key}`),
          load: false,
          ready: true,
          stale: false,
          stamp: Date.now(),
        } satisfies Box<DataMap[K]>

        if (seq.current[key] === id) {
          dispatch({ type: "load_done", key, box: next as Box<DataMap[Key]> })
        }

        return next
      })
      .finally(() => {
        if (wait.current[key] === task) {
          delete wait.current[key]
        }
      })

    wait.current[key] = task as Promise<Box<DataMap[Key]>>
    return task
  }, [])

  const ensure = useCallback(
    <K extends Key>(key: K) => {
      const cur = ref.current[key] as Box<DataMap[K]>
      if (cur.ready && !cur.stale) {
        return Promise.resolve(cur)
      }
      return pull(key, false)
    },
    [pull],
  )

  const refresh = useCallback(
    <K extends Key>(key: K) => pull(key, true),
    [pull],
  )

  const refreshMany = useCallback(
    async (keys: Key[]) => {
      await Promise.all(keys.map((key) => refresh(key)))
    },
    [refresh],
  )

  const invalidate = useCallback((key: Key) => {
    dispatch({ type: "invalidate", key })
  }, [])

  const syncProvider = useCallback(() => {
    const prev = ref.current.provider
    if (!prev.ready) return

    dispatch({
      type: "load_done",
      key: "provider",
      box: {
        ...prev,
        data: buildProvider(prev.data.providers, prev.data.config, prev.data.auth),
        load: false,
        stale: false,
        stamp: Date.now(),
      },
    })
  }, [])

  const selectWorkspace = useCallback((item: LocalWorkspace) => {
    setSelected(item.path)
  }, [])

  const clearWorkspace = useCallback(() => {
    setSelected(null)
  }, [])

  useEffect(() => {
    void ensure("provider")
    void ensure("agent")
    void ensure("workspace")

    let idle: number | undefined

    const run = () => {
      void ensure("mcp")
      void ensure("skill")
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idle = window.requestIdleCallback(run)
      return () => {
        if (idle !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idle)
        }
      }
    }

    const timer = setTimeout(run, 250)
    return () => {
      clearTimeout(timer)
    }
  }, [ensure])

  const current = useMemo(
    () => (selected ? state.workspace.data.workspaces.find((item) => item.path === selected) ?? null : null),
    [selected, state.workspace.data.workspaces],
  )

  const value = useMemo(
    () => ({
      ...state,
      ensure,
      refresh,
      refreshMany,
      invalidate,
      syncProvider,
      clearWorkspace,
      selectWorkspace,
      workspace: {
        ...state.workspace,
        selected: current,
      },
    }),
    [clearWorkspace, current, ensure, invalidate, refresh, refreshMany, selectWorkspace, state, syncProvider],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

export function useGlobalData() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("GlobalDataProvider is missing")
  }
  return ctx
}

export function useAgentList(current?: string) {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("agent")
  }, [ensure])

  const ags = useMemo(
    () =>
      data.agent.data.run
        .filter((item) => item.mode !== "subagent" && !item.hidden && allow(item.scope, current))
        .slice()
        .sort((a, b) => {
          const diff = rankAgent(a.name) - rankAgent(b.name)
          if (diff !== 0) {
            return diff
          }
          return a.name.localeCompare(b.name)
        }),
    [current, data.agent.data.run],
  )

  return useMemo(
    () => ({
      ags,
      err: data.agent.err,
      load: data.agent.load,
      names: ags.map((item) => item.name),
      reload: () => refresh("agent"),
      refresh: () => refresh("agent"),
    }),
    [ags, data.agent.err, data.agent.load, refresh],
  )
}

export function useSkillList(current?: string) {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("skill")
  }, [ensure])

  const list = useMemo(() => {
    const map = new Map<string, { name: string; description: string }>()

    for (const item of data.skill.data.cfg.skills) {
      if (!allow(item.scope, current)) continue
      map.set(item.name, {
        name: item.name,
        description: item.description || "",
      })
    }

    for (const item of data.skill.data.run) {
      if (!allow(item.scope, current)) continue
      map.set(item.name, {
        name: item.name,
        description: map.get(item.name)?.description || item.description || "",
      })
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [current, data.skill.data.cfg.skills, data.skill.data.run])

  return useMemo(
    () => ({
      err: data.skill.err,
      list,
      load: data.skill.load,
      names: list.map((item) => item.name),
      reload: () => refresh("skill"),
      refresh: () => refresh("skill"),
    }),
    [data.skill.err, data.skill.load, list, refresh],
  )
}

export function useProviderList() {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("provider")
  }, [ensure])

  return useMemo(
    () => ({
      auth: data.provider.data.auth,
      config: data.provider.data.config,
      connectedModels: data.provider.data.connectedModels,
      err: data.provider.err,
      load: data.provider.load,
      providers: data.provider.data.providers,
      reload: () => refresh("provider"),
      refresh: () => refresh("provider"),
      sync: data.syncProvider,
      visibleModels: data.provider.data.visibleModels,
    }),
    [
      data.provider.data.auth,
      data.provider.data.config,
      data.provider.data.connectedModels,
      data.provider.data.providers,
      data.provider.data.visibleModels,
      data.provider.err,
      data.provider.load,
      data.syncProvider,
      refresh,
    ],
  )
}

export function useWorkspaceList() {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("workspace")
  }, [ensure])

  return useMemo(
    () => ({
      basePath: data.workspace.data.basePath,
      clear: data.clearWorkspace,
      error: data.workspace.err || null,
      loaded: data.workspace.ready,
      loading: data.workspace.load,
      refresh: async () => {
        await refresh("workspace")
      },
      select: data.selectWorkspace,
      selected: data.workspace.selected,
      workspaces: data.workspace.data.workspaces,
    }),
    [
      data.clearWorkspace,
      data.selectWorkspace,
      data.workspace.data.basePath,
      data.workspace.data.workspaces,
      data.workspace.err,
      data.workspace.load,
      data.workspace.ready,
      data.workspace.selected,
      refresh,
    ],
  )
}
