import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { agentApi, mcpApi, modelChainApi, providerApi, skillApi } from "@/api/modules"
import { note } from "@/lib/error"
import { latestModels, modelKey, modelVisible, normalizeModelChain, readModelVisibility, signature } from "@/lib/model-catalog"
import type { GlobalAgentCatalog, RuntimeAgent } from "@/types/agent"
import type { ComposerModel, ProviderCatalogState } from "@/types/composer"
import type { McpDoc, McpMap } from "@/types/mcp"
import type { AuthMap, Config, List } from "@/types/provider"
import type { GlobalSkillCatalog, RuntimeSkill } from "@/types/skill"

type Key = "agent" | "provider" | "mcp" | "skill"

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

type DataMap = {
  agent: AgentData
  provider: ProviderData
  mcp: McpData
  skill: SkillData
}

type State = {
  agent: Box<AgentData>
  provider: Box<ProviderData>
  mcp: Box<McpData>
  skill: Box<SkillData>
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
  chainModels: [],
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

export const Ctx = createContext<Ctx | null>(null)

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
  const showAll = visibleModels.length === 0 && connectedModels.length > 0 && Object.keys(user).length === 0
  const shown = showAll ? connectedModels : visibleModels
  const map = new Map(shown.map((item) => [modelKey({ providerID: item.provider.id, modelID: item.id }), item]))

  return {
    providers,
    config,
    auth,
    connectedModels,
    visibleModels: shown,
    chainModels: normalizeModelChain(shown).flatMap((item) => map.get(modelKey(item)) ?? []),
  }
}

function refs(input: ComposerModel[]) {
  return input.map((item) => ({
    providerID: item.provider.id,
    modelID: item.id,
  }))
}

function msig(input: ComposerModel[]) {
  return signature(refs(input))
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
      ...(run.status === "rejected" ? [note(run.reason, "加载 agent 运行时列表失败")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "加载 agent 配置失败")] : []),
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
      ...(providers.status === "rejected" ? [note(providers.reason, "加载提供商列表失败")] : []),
      ...(config.status === "rejected" ? [note(config.reason, "加载提供商配置失败")] : []),
      ...(auth.status === "rejected" ? [note(auth.reason, "加载提供商认证信息失败")] : []),
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
      ...(doc.status === "rejected" ? [note(doc.reason, "加载 MCP 配置失败")] : []),
      ...(map.status === "rejected" ? [note(map.reason, "加载 MCP 状态失败")] : []),
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
      ...(run.status === "rejected" ? [note(run.reason, "加载 skill 运行时列表失败")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "加载 skill 配置失败")] : []),
    ]
      .filter(Boolean)
      .join("; "),
  }
}

export function useGlobalDataValue() {
  const [state, dispatch] = useReducer(reduce, undefined, initState)
  const ref = useRef(state)
  const chain = useRef("")
  const seq = useRef<Record<Key, number>>({
    agent: 0,
    provider: 0,
    mcp: 0,
    skill: 0,
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
            : loadSkill()
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
          err: note(err, `加载 ${key} 数据失败`),
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

  const refresh = useCallback(<K extends Key>(key: K) => pull(key, true), [pull])

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
    const next = buildProvider(prev.data.providers, prev.data.config, prev.data.auth)

    if (msig(prev.data.visibleModels) === msig(next.visibleModels) && msig(prev.data.chainModels) === msig(next.chainModels)) return

    dispatch({
      type: "load_done",
      key: "provider",
      box: {
        ...prev,
        data: next,
        load: false,
        stale: false,
        stamp: Date.now(),
      },
    })
  }, [])

  useEffect(() => {
    void ensure("provider")
    void ensure("agent")

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

  const list = useMemo(() => (state.provider.ready ? refs(state.provider.data.chainModels) : []), [
    state.provider.data.chainModels,
    state.provider.ready,
  ])
  const sig = signature(list)

  useEffect(() => {
    if (!sig || chain.current === sig) return

    chain.current = sig
    void modelChainApi
      .get()
      .then((cfg) => {
        if (cfg.chain.length > 0) return
        return modelChainApi.save({ chain: list })
      })
      .catch(() => undefined)
  }, [list, sig])

  return useMemo(
    () => ({
      ...state,
      ensure,
      refresh,
      refreshMany,
      invalidate,
      syncProvider,
    }),
    [ensure, invalidate, refresh, refreshMany, state, syncProvider],
  )
}

export function useGlobalData() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("缺少 GlobalDataProvider 上下文")
  }
  return ctx
}

export function useAgentList() {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("agent")
  }, [ensure])

  const ags = useMemo(
    () =>
      data.agent.data.run
        .filter((item) => item.mode !== "subagent" && !item.hidden)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.agent.data.run],
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

export function useSkillList() {
  const data = useGlobalData()
  const ensure = data.ensure
  const refresh = data.refresh

  useEffect(() => {
    void ensure("skill")
  }, [ensure])

  const list = useMemo(() => {
    const map = new Map<string, { name: string; description: string }>()

    data.skill.data.cfg.skills.forEach((item) => {
      map.set(item.name, {
        name: item.name,
        description: item.description || "",
      })
    })

    data.skill.data.run.forEach((item) => {
      map.set(item.name, {
        name: item.name,
        description: map.get(item.name)?.description || item.description || "",
      })
    })

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [data.skill.data.cfg.skills, data.skill.data.run])

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
  const refresh = data.refresh

  return useMemo(
    () => ({
      auth: data.provider.data.auth,
      chainModels: data.provider.data.chainModels,
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
      data.provider.data.chainModels,
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
