import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, LayoutGrid, RefreshCw } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MultiWorkspaceChatPanel } from "@/components/workspace/multi-workspace-chat-panel"
import { useAgentList, useProviderList, useWorkspaceList } from "@/data/global-data-provider"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"
import { decodeStrategyPath } from "@/lib/strategy-path"
import type { LocalWorkspace } from "@/types/workspace"

const ctrl =
  "rounded-xl border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

const shell =
  "rounded-[24px] border border-black/6 bg-background/80 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#0f1111]"

const box = [
  "rounded-[20px] border border-black/6 bg-background",
  "shadow-[0_14px_36px_rgba(15,23,42,0.08)]",
  "dark:border-white/8 dark:bg-[#13181b]",
].join(" ")

function size(size: number, i: number) {
  if (size === 2) return 50
  if (i === 0) return 34
  return 50
}

function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 1280)

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)")
    const onChange = () => setWide(window.innerWidth >= 1280)
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return wide
}

function Panel(props: { workspace: LocalWorkspace; onLoad: (value: boolean) => void }) {
  const catalog = useProviderList()
  const ags = useAgentList()
  const project = useProjectComposer(props.workspace.path)
  const { loading } = useChatSessions(props.workspace.path)
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

  const onAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) return
      project.setAgent(value)
    },
    [ags.ags, project],
  )

  const onModel = useCallback(
    (value: string) => {
      const [pid, ...rest] = value.split("/")
      const mid = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === pid && item.id === mid)) return
      project.setModel({ providerID: pid, modelID: mid })
    },
    [catalog.connectedModels, project],
  )

  const onVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  return (
    <div className="relative h-full min-h-0">
      <MultiWorkspaceChatPanel
        workspace={props.workspace}
        agents={ags.names}
        models={catalog.visibleModels}
        agent={composer.agent?.name}
        model={model}
        variant={composer.variant}
        variants={composer.variants}
        load={ags.load || catalog.load}
        onAgent={onAgent}
        onModel={onModel}
        onVariant={onVariant}
        onLoad={props.onLoad}
      />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-background/62 backdrop-blur-sm dark:bg-[#0f1111]/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  )
}

export default function StrategyMultiPage() {
  const [query] = useSearchParams()
  const { loading, refresh, workspaces } = useWorkspaceList()
  const wide = useWide()
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
  const [spin, setSpin] = useState(false)
  const [load, setLoad] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState("")
  const busy = list.some((item) => load[item.path] !== false)

  useEffect(() => {
    if (list.length === 0) return
    if (list.some((item) => item.path === tab)) return
    setTab(list[0].path)
  }, [list, tab])

  const onRefresh = async () => {
    setSpin(true)
    try {
      await refresh()
    } finally {
      setSpin(false)
    }
  }

  const onLoad = useCallback((path: string, value: boolean) => {
    setLoad((prev) => {
      if (prev[path] === value) return prev
      return { ...prev, [path]: value }
    })
  }, [])

  const pane = useCallback(
    (item: (typeof list)[number]) => (
      <section className={`${box} relative h-full min-h-0 min-w-0 overflow-hidden`}>
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="min-h-0 flex-1 px-0.5 pb-0.5 pt-2">
            <Panel workspace={item} onLoad={(value) => onLoad(item.path, value)} />
          </div>
        </div>
      </section>
    ),
    [onLoad],
  )

  if (loading && list.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载多屏工作区...</div>
    )
  }

  if (invalid || missing || list.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">多屏开发加载失败</div>
        <div className="text-sm text-muted-foreground">
          {invalid ? "请选择 2 到 3 个策略工作区进入多屏开发。" : "部分策略工作区不存在，或仍在加载中。"}
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
    <div className="sticky flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="px-6 pb-1 pt-1 dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="outline" size="sm" className={`${ctrl} h-8 w-8 rounded-full`} asChild>
              <Link to="/app/strategies">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-black/6 bg-black/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                <LayoutGrid className="size-3" />
                {list.length} 个工作区
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className={`${ctrl} h-8 px-3`} onClick={onRefresh} disabled={spin}>
            <RefreshCw className={`size-4 ${spin ? "animate-spin" : ""}`} />
            {spin ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <div className={`${shell} flex h-full min-h-0 flex-col overflow-hidden`}>
          <div className="relative min-h-0 flex-1 p-1.5">
            {wide ? (
              list.length === 2 ? (
                <ResizablePanelGroup
                  direction="horizontal"
                  autoSaveId="strategy-front:strategy-multi-split:v3"
                  className="h-full min-h-0"
                >
                  <ResizablePanel defaultSize={size(list.length, 0)} minSize={320} className="min-h-0 min-w-0">
                    {pane(list[0])}
                  </ResizablePanel>
                  <ResizableHandle withHandle className="pointer" />
                  <ResizablePanel defaultSize={size(list.length, 1)} minSize={320} className="min-h-0 min-w-0">
                    {pane(list[1])}
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <ResizablePanelGroup
                  direction="horizontal"
                  autoSaveId="strategy-front:strategy-multi-split:v4"
                  className="h-full min-h-0"
                >
                  <ResizablePanel defaultSize={size(list.length, 0)} minSize={300} className="min-h-0 min-w-0">
                    {pane(list[0])}
                  </ResizablePanel>
                  <ResizableHandle withHandle className="pointer" />
                  <ResizablePanel defaultSize={66} minSize={620} className="min-h-0 min-w-0">
                    <ResizablePanelGroup
                      direction="horizontal"
                      autoSaveId="strategy-front:strategy-multi-split:v4:right"
                      className="h-full min-h-0"
                    >
                      <ResizablePanel defaultSize={size(list.length, 1)} minSize={300} className="min-h-0 min-w-0">
                        {pane(list[1])}
                      </ResizablePanel>
                      <ResizableHandle withHandle className="pointer" />
                      <ResizablePanel defaultSize={size(list.length, 2)} minSize={300} className="min-h-0 min-w-0">
                        {pane(list[2])}
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )
            ) : (
              <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-1 flex-col gap-2">
                <div className="overflow-x-auto">
                  <TabsList className="inline-flex h-auto min-w-full justify-start gap-2 rounded-2xl border border-black/6 bg-black/[0.025] p-1 dark:border-white/8 dark:bg-white/[0.03]">
                    {list.map((item, i) => (
                      <TabsTrigger
                        key={item.path}
                        value={item.path}
                        className="max-w-56 shrink-0 rounded-xl px-3 py-2 data-[state=active]:shadow-sm"
                      >
                        <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.05] px-1.5 text-[11px] dark:bg-white/[0.08]">
                          {i + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {list.map((item) => (
                  <TabsContent
                    key={item.path}
                    value={item.path}
                    className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
                  >
                    {pane(item)}
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-background/52 backdrop-blur-sm dark:bg-background/38">
                <div className="flex items-center gap-3 rounded-full border border-black/6 bg-background/85 px-4 py-2 text-sm text-foreground shadow-sm dark:border-white/10 dark:bg-[#111615]">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  正在准备多屏工作区...
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
