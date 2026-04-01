import { useCallback, useMemo } from "react"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { GroupChatPanel } from "@/components/group/group-chat-panel"
import { Button } from "@/components/ui/button"
import { useAgentList, useProviderList } from "@/data/global-data-provider"
import { useGroupDetail } from "@/hooks/use-group-detail"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"

const ctrl =
  "rounded-xl border border-black/8 bg-black/[0.03] text-xs shadow-none hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"

export default function GroupDetailPage() {
  const params = useParams()
  const ags = useAgentList()
  const catalog = useProviderList()
  const project = useProjectComposer()
  const { group, loading, error, refresh } = useGroupDetail(params.groupID)
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
      const [providerID, ...rest] = value.split("/")
      const modelID = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) return
      project.setModel({ providerID, modelID })
    },
    [catalog.connectedModels, project],
  )

  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  if (loading && !group) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载组合策略...</div>
    )
  }

  if (error || !group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">组合策略加载失败</div>
        <div className="text-sm text-muted-foreground">{error ?? "未找到对应的组合策略。"}</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/groups">
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
      <div className="px-6 pb-1 pt-1 dark:bg-card border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="outline" size="sm" className={ctrl} asChild>
              <Link to="/app/groups">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{group.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <div
          className={`grid h-full min-h-0 auto-rows-fr divide-y divide-black/6 overflow-hidden rounded-[28px] bg-transparent dark:divide-white/8 ${
            group.items.length >= 3
              ? "grid-cols-1 xl:grid-cols-3 xl:divide-x xl:divide-y-0"
              : "grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-y-0"
          }`}
        >
          {group.items.map((item) => (
            <div key={item.id} className="min-h-0 px-2">
              <GroupChatPanel
                workspace={item.workspace}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
