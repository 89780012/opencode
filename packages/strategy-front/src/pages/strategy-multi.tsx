import { useCallback, useMemo } from "react"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { MultiWorkspaceChatPanel } from "@/components/workspace/multi-workspace-chat-panel"
import { useAgentList, useProviderList, useWorkspaceList } from "@/data/global-data-provider"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"
import { decodeStrategyPath } from "@/lib/strategy-path"
import type { LocalWorkspace } from "@/types/workspace"

const ctrl =
  "rounded-xl border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

function cols(size: number) {
  if (size === 3) return "grid-cols-1 xl:grid-cols-3"
  return "grid-cols-1 xl:grid-cols-2"
}

function Panel(props: { workspace: LocalWorkspace }) {
  const catalog = useProviderList()
  const ags = useAgentList()
  const project = useProjectComposer(props.workspace.path)
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined

  const setAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) return
      project.setAgent(value)
    },
    [ags.ags, project],
  )

  const setModel = useCallback(
    (value: string) => {
      const [pid, ...rest] = value.split("/")
      const mid = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === pid && item.id === mid)) return
      project.setModel({ providerID: pid, modelID: mid })
    },
    [catalog.connectedModels, project],
  )

  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  return (
    <MultiWorkspaceChatPanel
      workspace={props.workspace}
      agents={ags.names}
      models={catalog.visibleModels}
      agent={composer.agent?.name}
      model={model}
      variant={composer.variant}
      variants={composer.variants}
      load={ags.load || catalog.load}
      onAgent={setAgent}
      onModel={setModel}
      onVariant={setVariant}
    />
  )
}

export default function StrategyMultiPage() {
  const [query] = useSearchParams()
  const { loading, refresh, workspaces } = useWorkspaceList()
  const paths = useMemo(
    () =>
      query
        .getAll("path")
        .map((item) => decodeStrategyPath(item))
        .filter(Boolean),
    [query],
  )
  const items = useMemo(() => {
    const map = new Map(workspaces.map((item) => [item.path, item]))
    return paths.map((path) => map.get(path) ?? null)
  }, [paths, workspaces])
  const list = useMemo(() => items.filter((item): item is (typeof workspaces)[number] => !!item), [items])
  const missing = useMemo(() => items.some((item) => !item), [items])
  const invalid = paths.length < 2 || paths.length > 3

  if (loading && list.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载多屏工作区...</div>
  }

  if (invalid || missing || list.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">多屏开发加载失败</div>
        <div className="text-sm text-muted-foreground">
          {invalid ? "请选择 2 到 3 个策略工作区进入多屏开发。" : "部分策略工作区不存在或尚未加载完成。"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/strategies">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky flex h-full min-h-0 flex-col bg-background dark:bg-[#0f1111]">
      <div className="border-b px-6 pb-2 pt-2 dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="outline" size="sm" className={ctrl} asChild>
              <Link to="/app/strategies">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">多屏开发</div>
              <div className="text-xs text-muted-foreground">已选择 {list.length} 个策略工作区，正在并行开发。</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className={ctrl} onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3">
        <div
          className={`grid h-full min-h-0 auto-rows-fr divide-y divide-black/6 overflow-hidden rounded-[28px] bg-transparent dark:divide-white/8 ${cols(list.length)} 2xl:divide-y-0 2xl:divide-x`}
        >
          {list.map((item) => (
            <div key={item.path} className="min-h-0 px-2">
              <Panel workspace={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
