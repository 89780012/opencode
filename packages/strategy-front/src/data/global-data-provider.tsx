import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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

type Ctx = State & {
  ensure: <K extends Key>(key: K) => Promise<Box<DataMap[K]>>
  refresh: <K extends Key>(key: K) => Promise<Box<DataMap[K]>>
  refreshMany: (keys: Key[]) => Promise<void>
  invalidate: (key: Key) => void
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

// 为每类资源创建统一的包装状态，页面层只需要消费同一组字段。
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

// 统一归一异常文本，避免页面重复做类型判断。
function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === "string" && err) {
    return err
  }

  return fallback
}

// 规整 agent 配置，保证目录和列表字段始终存在。
function normAgentCfg(input?: Partial<GlobalAgentCatalog> | null): GlobalAgentCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    agents: Array.isArray(input?.agents) ? input.agents : [],
  }
}

// 规整 skill 配置，保证目录和列表字段始终存在。
function normSkillCfg(input?: Partial<GlobalSkillCatalog> | null): GlobalSkillCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    skills: Array.isArray(input?.skills) ? input.skills : [],
  }
}

// 统一补齐 workspace 字段，避免服务端缺省值影响前端。
function normWorkspace(item: LocalWorkspace): LocalWorkspace {
  return {
    ...item,
    type: item.type === "smartx" || item.type === "python" || item.type === "js" ? item.type : undefined,
    template: typeof item.template === "string" ? item.template : undefined,
    entry_file: typeof item.entry_file === "string" ? item.entry_file : undefined,
    keywords: item.keywords ?? [],
    updated_at: typeof item.updated_at === "number" ? item.updated_at : 0,
  }
}

// 判断选中的 workspace 与最新列表中的快照是否一致。
function same(a: LocalWorkspace | null, b: LocalWorkspace) {
  if (!a) {
    return false
  }
  if (a.path !== b.path || a.name !== b.name || a.vcs !== b.vcs) {
    return false
  }
  if (a.type !== b.type || a.template !== b.template || a.entry_file !== b.entry_file) {
    return false
  }
  if (a.keywords.length !== b.keywords.length) {
    return false
  }
  return a.keywords.every((item, i) => item === b.keywords[i])
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

// 基于 provider 原始数据派生出首页和模型页直接可用的模型目录。
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

// 并行拉取 agent 运行态和全局配置，允许局部失败后继续展示已成功部分。
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

// 拉取 provider 目录、全局配置和授权方式，并生成派生模型列表。
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

// MCP 同时依赖配置和运行态，这里统一聚合成一个资源。
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

// 并行拉取 skill 运行态和全局目录。
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

// 拉取本地 workspace 列表，作为整个应用共享的目录数据源。
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
  const [selected, setSelected] = useState<LocalWorkspace | null>(null)
  const [state, setState] = useState<State>({
    agent: item(emptyAgent),
    provider: item(emptyProvider),
    mcp: item(emptyMcp),
    skill: item(emptySkill),
    workspace: item(emptyWorkspace),
  })
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

  // 统一真实加载入口，负责请求去重、竞态保护和落库。
  const pull = useCallback(<K extends Key>(key: K, force: boolean) => {
    const cur = wait.current[key] as Promise<Box<DataMap[K]>> | undefined
    if (cur && !force) {
      return cur
    }

    const id = ++seq.current[key]
    setState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        load: true,
      },
    }))

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
          setState((prev) => ({
            ...prev,
            [key]: next,
          }))
        }

        return next
      })
      .catch((err) => {
        const prev = ref.current[key] as Box<DataMap[K]>
        const next = {
          ...prev,
          err: note(err, `加载 ${key} 失败`),
          load: false,
          ready: true,
          stale: false,
          stamp: Date.now(),
        } satisfies Box<DataMap[K]>

        if (seq.current[key] === id) {
          setState((last) => ({
            ...last,
            [key]: next,
          }))
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

  // 仅在资源未就绪或已标脏时触发加载，适合页面首次进入时调用。
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

  // 强制刷新指定资源，忽略当前缓存状态。
  const refresh = useCallback(
    <K extends Key>(key: K) => {
      return pull(key, true)
    },
    [pull],
  )

  // opencode 重启这类场景会跨多个资源，这里提供批量刷新能力。
  const refreshMany = useCallback(
    async (keys: Key[]) => {
      await Promise.all(keys.map((key) => refresh(key)))
    },
    [refresh],
  )

  // 只标记资源已过期，不立即发请求，等待后续 ensure 或 refresh。
  const invalidate = useCallback((key: Key) => {
    setState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        stale: true,
      },
    }))
  }, [])

  // 切换当前选中的 workspace，由全局资源层统一管理。
  const selectWorkspace = useCallback((item: LocalWorkspace) => {
    setSelected(normWorkspace(item))
  }, [])

  // 清空当前选中的 workspace。
  const clearWorkspace = useCallback(() => {
    setSelected(null)
  }, [])

  // 应用启动时预取关键资源，次级资源放到空闲阶段补齐。
  useEffect(() => {
    void ensure("provider")
    void ensure("agent")
    void ensure("workspace")

    let timer: ReturnType<typeof setTimeout> | undefined
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

    timer = setTimeout(run, 250)
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [ensure])

  // 当 workspace 列表变化时，在全局层自动修正当前选中项。
  useEffect(() => {
    if (!state.workspace.ready || !selected?.path) {
      return
    }

    const cur = state.workspace.data.workspaces.find((item) => item.path === selected.path)
    if (!cur) {
      setSelected(null)
      return
    }

    if (same(selected, cur)) {
      return
    }

    setSelected(cur)
  }, [selected, state.workspace.data.workspaces, state.workspace.ready])

  const value = useMemo(
    () => ({
      ...state,
      ensure,
      refresh,
      refreshMany,
      invalidate,
      clearWorkspace,
      selectWorkspace,
      workspace: {
        ...state.workspace,
        selected,
      },
    }),
    [clearWorkspace, ensure, invalidate, refresh, refreshMany, selectWorkspace, selected, state],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

// 暴露完整全局资源上下文，供页面做更细粒度控制。
export function useGlobalData() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("GlobalDataProvider is missing")
  }
  return ctx
}

// 首页聊天场景使用的 agent 目录 hook，返回过滤和排序后的 agent 列表。
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

// provider 页面和首页模型选择器使用的 provider 目录 hook。
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
      refresh,
    ],
  )
}

// workspace 目录 hook，统一返回列表、选中项和操作方法。
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
