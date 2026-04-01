import { useCallback, useMemo } from "react"
import { ArrowLeft, Boxes, RefreshCw } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { GroupChatPanel } from "@/components/group/group-chat-panel"
import { Button } from "@/components/ui/button"
import { useAgentList, useProviderList } from "@/data/global-data-provider"
import { useGroupDetail } from "@/hooks/use-group-detail"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"

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
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">加载组合策略中...</div>
  }

  if (error || !group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-base font-semibold">组合策略加载失败</div>
        <div className="text-sm text-muted-foreground">{error ?? "未找到组合策略"}</div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app">
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
          </Button>
          <Button onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            重试
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Boxes className="size-4" />
              组合策略
            </div>
            <div className="mt-1 text-2xl font-semibold">{group.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">共 {group.items.length} 个策略工作区，支持分屏独立 AI 协作</div>
          </div>
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
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div
          className={`grid h-full min-h-0 auto-rows-fr gap-4 ${
            group.items.length >= 3 ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1 xl:grid-cols-2"
          }`}
        >
          {group.items.map((item) => (
            <div key={item.id} className="min-h-0">
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
