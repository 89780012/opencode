import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { agentApi, mcpApi, providerApi, skillApi } from "@/api/modules"
import { rankAgent } from "@/lib/chat-composer"
import { latestModels, modelVisible, readModelVisibility } from "@/lib/model-catalog"
import type { RuntimeAgent, GlobalAgentCatalog } from "@/types/agent"
import type { ComposerModel, ProviderCatalogState } from "@/types/composer"
import type { McpDoc, McpMap } from "@/types/mcp"
import type { AuthMap, Config, List } from "@/types/provider"
import type { RuntimeSkill, GlobalSkillCatalog } from "@/types/skill"

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

type Map = {
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

type Ctx = State & {
  ensure: <K extends Key>(key: K) => Promise<Box<Map[K]>>
  refresh: <K extends Key>(key: K) => Promise<Box<Map[K]>>
  refreshMany: (keys: Key[]) => Promise<void>
  invalidate: (key: Key) => void
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

const Ctx = createContext<Ctx | null>(null)

// 为每类全局资源创建统一的初始包装状态。
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

// 把不同来源的异常统一收敛成可展示的错误文本。
function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === "string" && err) {
    return err
  }

  return text
}

// 规整 agent 全局配置，避免后端字段缺失时前端分支过多。
function normAgentCfg(input?: Partial<GlobalAgentCatalog> | null): GlobalAgentCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    agents: Array.isArray(input?.agents) ? input.agents : [],
  }
}

// 规整 skill 全局配置，确保目录和列表字段始终可用。
function normSkillCfg(input?: Partial<GlobalSkillCatalog> | null): GlobalSkillCatalog {
  return {
    root: typeof input?.root === "string" ? input.root : "",
    skills: Array.isArray(input?.skills) ? input.skills : [],
  }
}

// 基于 provider 原始数据派生出聊天页和模型页直接可消费的目录数据。
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

// 并行拉取 agent 运行态和全局配置，并把部分失败收敛为可继续展示的结果。
async function loadAgent(): Promise<Out<AgentData>> {
  const [run, cfg] = await Promise.allSettled([agentApi.listRuntime(), agentApi.listGlobal()])

  return {
    data: {
      run: run.status === "fulfilled" && Array.isArray(run.value) ? run.value : [],
      cfg: cfg.status === "fulfilled" ? normAgentCfg(cfg.value) : emptyAgent.cfg,
    },
    err: [
      ...(run.status === "rejected" ? [note(run.reason, "加载 Agent 运行态失败")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "加载 Agent 配置失败")] : []),
    ]
      .filter(Boolean)
      .join("；"),
  }
}

// 拉取 provider 目录、全局配置和授权方式，并同步生成派生模型列表。
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
      ...(providers.status === "rejected" ? [note(providers.reason, "加载 Provider 列表失败")] : []),
      ...(config.status === "rejected" ? [note(config.reason, "加载 Provider 配置失败")] : []),
      ...(auth.status === "rejected" ? [note(auth.reason, "加载 Provider 授权方式失败")] : []),
    ]
      .filter(Boolean)
      .join("；"),
  }
}

// MCP 同时依赖配置和运行态，这里统一打包成一个资源返回。
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
      .join("；"),
  }
}

// 并行拉取 skill 运行态和全局文件目录。
async function loadSkill(): Promise<Out<SkillData>> {
  const [run, cfg] = await Promise.allSettled([skillApi.listRuntime(), skillApi.listGlobal()])

  return {
    data: {
      run: run.status === "fulfilled" && Array.isArray(run.value) ? run.value : [],
      cfg: cfg.status === "fulfilled" ? normSkillCfg(cfg.value) : emptySkill.cfg,
    },
    err: [
      ...(run.status === "rejected" ? [note(run.reason, "加载 Skill 运行态失败")] : []),
      ...(cfg.status === "rejected" ? [note(cfg.reason, "加载 Skill 配置失败")] : []),
    ]
      .filter(Boolean)
      .join("；"),
  }
}

export function GlobalDataProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    agent: item(emptyAgent),
    provider: item(emptyProvider),
    mcp: item(emptyMcp),
    skill: item(emptySkill),
  })
  const ref = useRef(state)
  const seq = useRef<Record<Key, number>>({
    agent: 0,
    provider: 0,
    mcp: 0,
    skill: 0,
  })
  const wait = useRef<Partial<Record<Key, Promise<Box<Map[Key]>>>>>({})

  useEffect(() => {
    ref.current = state
  }, [state])

  // 资源真实加载入口：负责请求去重、强制刷新、竞态保护和最终落库。
  const pull = useCallback(<K extends Key>(key: K, force: boolean) => {
    const cur = wait.current[key] as Promise<Box<Map[K]>> | undefined
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
      key === "agent" ? loadAgent() : key === "provider" ? loadProvider() : key === "mcp" ? loadMcp() : loadSkill()
    )
      .then((out) => {
        const next = {
          data: out.data as Map[K],
          err: out.err,
          load: false,
          ready: true,
          stale: false,
          stamp: Date.now(),
        } satisfies Box<Map[K]>

        if (seq.current[key] === id) {
          setState((prev) => ({
            ...prev,
            [key]: next,
          }))
        }

        return next
      })
      .catch((err) => {
        const prev = ref.current[key] as Box<Map[K]>
        const next = {
          ...prev,
          err: note(err, `加载 ${key} 失败`),
          load: false,
          ready: true,
          stale: false,
          stamp: Date.now(),
        } satisfies Box<Map[K]>

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

    wait.current[key] = task as Promise<Box<Map[Key]>>
    return task
  }, [])

  // 只在资源未就绪或已标脏时触发加载，适合页面进入时调用。
  const ensure = useCallback(
    <K extends Key>(key: K) => {
      const cur = ref.current[key] as Box<Map[K]>
      if (cur.ready && !cur.stale) {
        return Promise.resolve(cur)
      }
      return pull(key, false)
    },
    [pull],
  )

  // 忽略缓存和脏标记，直接重拉指定资源。
  const refresh = useCallback(
    <K extends Key>(key: K) => {
      return pull(key, true)
    },
    [pull],
  )

  // 用于重启 opencode 这类跨资源场景，批量刷新多个目录。
  const refreshMany = useCallback(
    async (keys: Key[]) => {
      await Promise.all(keys.map((key) => refresh(key)))
    },
    [refresh],
  )

  // 仅把资源标记为过期，不立即发请求，等待下次 ensure 或 refresh。
  const invalidate = useCallback((key: Key) => {
    setState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        stale: true,
      },
    }))
  }, [])

  // 应用启动时预取关键资源，次级资源放到空闲阶段补齐。
  useEffect(() => {
    void ensure("provider")
    void ensure("agent")

    let timer: ReturnType<typeof setTimeout> | undefined
    let idle: number | undefined

    const run = () => {
      void ensure("mcp")
      void ensure("skill")
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idle = window.requestIdleCallback(run)
    } else if (typeof window !== "undefined") {
      timer = setTimeout(run, 250)
    }

    return () => {
      if (idle && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idle)
      }
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [ensure])

  const value = useMemo(
    () => ({
      ...state,
      ensure,
      refresh,
      refreshMany,
      invalidate,
    }),
    [ensure, invalidate, refresh, refreshMany, state],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

// 暴露完整全局资源上下文，供页面级组件直接做精细控制。
export function useGlobalData() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("GlobalDataProvider is missing")
  }
  return ctx
}

// 面向首页聊天场景的 agent 目录 hook，返回过滤和排序后的可选 agent。
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
        .sort((a, b) => {
          const diff = rankAgent(a.name) - rankAgent(b.name)
          if (diff !== 0) return diff
          return a.name.localeCompare(b.name)
        }),
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

// 面向 provider 页面和首页模型选择器的 provider 目录 hook。
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
