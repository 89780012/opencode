import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Plus, RefreshCcw, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  InfoBanner,
  ResourceCard,
  ResourceSection,
  ResourceState,
  StatCards,
} from "@/components/shared/global-resource-section"
import { useProviderList } from "@/data/global-data-provider"
import { useProviderPage } from "@/hooks/use-provider-page"
import { latestModels, modelKey, modelVisible, readModelVisibility, writeModelCatalog } from "@/lib/model-catalog"
import type { ComposerModel } from "@/types/composer"
import type { Provider } from "@/types/provider"
import { ProviderConnectDialog } from "../provider/provider-connect-dialog"
import { ProviderCustomDialog } from "../provider/provider-custom-dialog"
import { note, popular, source } from "../provider/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: string
  models: ComposerModel[]
  variant?: string | null
  variants: string[]
  onModel: (value: string) => void
  onVariant: (value: string) => void
}

type Vis = "show" | "hide"
type Key = {
  providerID: string
  modelID: string
}
type Row = ComposerModel & {
  def: boolean
  free: boolean
}

function match(row: Row, q: string) {
  if (!q) return true
  const item = `${row.provider.name} ${row.name} ${row.id}`.toLowerCase()
  return item.includes(q)
}

function sortProvider(a: string, b: string, map: Map<string, string>) {
  const ai = popular.indexOf(a)
  const bi = popular.indexOf(b)
  const ap = ai >= 0
  const bp = bi >= 0

  if (ap && !bp) return -1
  if (!ap && bp) return 1
  if (ap && bp) return ai - bi

  return (map.get(a) ?? a).localeCompare(map.get(b) ?? b)
}

function ProviderRow(props: {
  item: Provider
  linked: boolean
  busy: boolean
  mode: "connected" | "available"
  onPick: (item: Provider) => void
  onRemove: (item: Provider) => void
}) {
  const models = Object.keys(props.item.models ?? {}).length
  const msg = note(props.item.id)

  return (
    <ResourceCard
      title={props.item.name}
      badges={[props.item.id, ...(props.linked ? [source(props.item)] : [])]}
      desc={msg}
      meta={[
        <span key="models">{models} 个模型</span>,
        ...(props.item.env.length > 0 ? [<span key="env">{props.item.env.length} 个环境变量</span>] : []),
        ...(props.item.api ? [<span key="api">{props.item.api}</span>] : []),
      ]}
      actions={
        props.mode === "available" ? (
          <Button onClick={() => props.onPick(props.item)}>连接</Button>
        ) : props.item.source === "env" ? (
          <span className="text-sm text-muted-foreground">来自环境变量</span>
        ) : (
          <Button variant="outline" onClick={() => props.onRemove(props.item)} disabled={props.busy}>
            {props.busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                处理中...
              </>
            ) : (
              "断开"
            )}
          </Button>
        )
      }
    />
  )
}

function ProviderList(props: {
  items: Provider[]
  linked: Set<string>
  busy: string
  mode: "connected" | "available"
  onPick: (item: Provider) => void
  onRemove: (item: Provider) => void
}) {
  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <ProviderRow
          key={item.id}
          item={item}
          linked={props.linked.has(item.id)}
          busy={props.busy === item.id}
          mode={props.mode}
          onPick={props.onPick}
          onRemove={props.onRemove}
        />
      ))}
    </div>
  )
}

export function EmbedProviderSettingsDialog(props: Props) {
  const page = useProviderPage()
  const prv = useProviderList()
  const [tab, setTab] = useState("providers")
  const [q, setQ] = useState("")
  const [user, setUser] = useState<Record<string, Vis>>(() => readModelVisibility())
  const dq = useDeferredValue(q.trim().toLowerCase())
  const sync = useRef(prv.sync)
  const linked = useMemo(() => new Set(page.providers.connected), [page.providers.connected])
  const rows = useMemo(
    () =>
      page.connected.flatMap((provider) =>
        Object.values(provider.models).map((model) => ({
          ...model,
          provider,
          def: page.providers.default[provider.id] === model.id,
          free: provider.id === "opencode" && (!model.cost || model.cost.input === 0),
        })),
      ),
    [page.connected, page.providers.default],
  )
  const latest = useMemo(() => latestModels(rows), [rows])
  const pick = props.models.some((item) => `${item.provider.id}/${item.id}` === props.model)
    ? (props.model ?? "")
    : props.models[0]
      ? `${props.models[0].provider.id}/${props.models[0].id}`
      : ""

  useEffect(() => {
    sync.current = prv.sync
  }, [prv.sync])

  useEffect(() => {
    if (!props.open) return
    setUser(readModelVisibility())
    setQ("")
  }, [props.open])

  useEffect(() => {
    if (typeof window === "undefined") return
    writeModelCatalog({ user })
    sync.current()
  }, [user])

  const visible = (input: Key, row?: Row) =>
    modelVisible({
      row,
      user,
      latest,
      model: input,
    })

  const setVisible = (input: Key, on: boolean) => {
    const id = modelKey(input)
    setUser((prev) => ({ ...prev, [id]: on ? "show" : "hide" }))
  }

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>()
    const name = new Map<string, string>()

    rows.forEach((row) => {
      if (!match(row, dq)) return
      const items = map.get(row.provider.id) ?? []
      items.push(row)
      map.set(row.provider.id, items)
      name.set(row.provider.id, row.provider.name)
    })

    return Array.from(map.entries())
      .sort((a, b) => sortProvider(a[0], b[0], name))
      .map(([id, items]) => ({
        id,
        name: name.get(id) ?? id,
        items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [dq, rows])

  const stats = useMemo(() => {
    const shown = rows.filter((row) => visible({ providerID: row.provider.id, modelID: row.id }, row)).length
    return {
      providers: page.connected.length,
      models: rows.length,
      shown,
    }
  }, [page.connected.length, rows, user, latest])

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>嵌入设置</DialogTitle>
            <DialogDescription>
              在这里连接提供商、管理模型展示，并决定当前会话默认使用哪个模型。
            </DialogDescription>
          </DialogHeader>

          <Tabs className="min-h-0 flex-1 gap-0" value={tab} onValueChange={setTab}>
            <div className="border-b px-6 py-3">
              <TabsList>
                <TabsTrigger value="providers">提供商</TabsTrigger>
                <TabsTrigger value="models">模型展示</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="providers" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-[calc(85vh-150px)]">
                <div className="space-y-6 px-6 py-5">
                  <Card className="gap-0">
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <CardTitle>提供商连接</CardTitle>
                          <CardDescription>连接后，模型会立即进入当前嵌入页和全局模型目录。</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" onClick={() => void page.refresh()} disabled={page.load}>
                            <RefreshCcw className={page.load ? "size-4 animate-spin" : "size-4"} />
                            刷新
                          </Button>
                          <Button onClick={() => page.setCustomOpen(true)}>
                            <Plus className="size-4" />
                            添加自定义提供商
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <StatCards
                        items={[
                          { label: "已连接", value: page.connected.length },
                          { label: "可连接", value: page.providers.all.length - page.connected.length },
                          { label: "当前展示模型", value: stats.shown },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <InfoBanner>连接或断开 provider 后，下方输入框里的模型下拉会自动同步更新。</InfoBanner>

                  {page.err ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {page.err}
                    </div>
                  ) : null}

                  <ResourceSection title="已连接提供商" desc="已连接的 provider 会直接暴露模型给当前嵌入会话。">
                    <ResourceState
                      loading={page.load}
                      empty={page.connected.length === 0}
                      loading_text="正在加载提供商状态..."
                      empty_text="暂时还没有连接任何提供商。"
                    >
                      <ProviderList
                        items={page.connected}
                        linked={linked}
                        busy={page.busy}
                        mode="connected"
                        onPick={page.setItem}
                        onRemove={(item) => void page.remove(item)}
                      />
                    </ResourceState>
                  </ResourceSection>

                  <ResourceSection title="热门提供商" desc="常用 provider 可以直接在这里完成连接。">
                    <ResourceState
                      loading={page.load}
                      empty={page.popularList.length === 0}
                      loading_text="正在加载提供商..."
                      empty_text="没有更多热门 provider。"
                    >
                      <ProviderList
                        items={page.popularList}
                        linked={linked}
                        busy={page.busy}
                        mode="available"
                        onPick={page.setItem}
                        onRemove={(item) => void page.remove(item)}
                      />
                    </ResourceState>
                  </ResourceSection>

                  <ResourceSection title="更多提供商" desc="后端已识别但尚未连接的其他 provider。">
                    <ResourceState
                      loading={page.load}
                      empty={page.other.length === 0}
                      loading_text="正在加载提供商..."
                      empty_text="没有更多可用 provider。"
                    >
                      <ProviderList
                        items={page.other}
                        linked={linked}
                        busy={page.busy}
                        mode="available"
                        onPick={page.setItem}
                        onRemove={(item) => void page.remove(item)}
                      />
                    </ResourceState>
                  </ResourceSection>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="models" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-[calc(85vh-150px)]">
                <div className="space-y-6 px-6 py-5">
                  <Card className="gap-0">
                    <CardHeader className="border-b">
                      <div className="space-y-2">
                        <CardTitle>当前模型</CardTitle>
                        <CardDescription>这里选择当前会话默认模型，展示范围由下方的模型目录决定。</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 py-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">模型</div>
                        <Select value={pick} onValueChange={props.onModel} disabled={props.models.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.models.map((item) => (
                              <SelectItem key={`${item.provider.id}/${item.id}`} value={`${item.provider.id}/${item.id}`}>
                                {`${item.id} (${item.provider.id})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {props.variants.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">变体</div>
                          <Select value={props.variant ?? "default"} onValueChange={props.onVariant}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择变体" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">default</SelectItem>
                              {props.variants.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      <div className="rounded-lg border border-dashed px-3 py-2 text-xs leading-5 text-muted-foreground">
                        隐藏某个模型后，它会从输入框的模型下拉中消失；如果当前模型被隐藏，界面会自动切到下一个可见模型。
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="gap-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <CardTitle>模型目录</CardTitle>
                          <CardDescription>决定当前嵌入页和全局聊天输入框里显示哪些模型。</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" onClick={() => void prv.reload()} disabled={prv.load}>
                            <RefreshCcw className={prv.load ? "size-4 animate-spin" : "size-4"} />
                            刷新
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setUser({})
                              writeModelCatalog({ user: {} })
                            }}
                            disabled={prv.load || Object.keys(user).length === 0}
                          >
                            <RotateCcw className="size-4" />
                            重置显示状态
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜索提供商或模型" />
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 py-6 md:grid-cols-3">
                      <div className="rounded-2xl border bg-muted/20 px-4 py-4">
                        <div className="text-sm text-muted-foreground">已连接提供商</div>
                        <div className="mt-2 text-3xl font-semibold">{stats.providers}</div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 px-4 py-4">
                        <div className="text-sm text-muted-foreground">模型总数</div>
                        <div className="mt-2 text-3xl font-semibold">{stats.models}</div>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 px-4 py-4">
                        <div className="text-sm text-muted-foreground">当前展示</div>
                        <div className="mt-2 text-3xl font-semibold">{stats.shown}</div>
                      </div>
                    </CardContent>
                  </Card>

                  {prv.err ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {prv.err}
                    </div>
                  ) : null}

                  {prv.load ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      正在加载模型目录...
                    </div>
                  ) : stats.providers === 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>暂无已连接提供商</CardTitle>
                        <CardDescription>先连接至少一个 provider，模型目录才会出现可选项。</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => setTab("providers")}>去连接提供商</Button>
                      </CardContent>
                    </Card>
                  ) : groups.length === 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>没有匹配的模型</CardTitle>
                        <CardDescription>可以换个关键词，或者清空搜索条件再试。</CardDescription>
                      </CardHeader>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {groups.map((group) => {
                        const all = group.items.every((item) =>
                          visible({ providerID: item.provider.id, modelID: item.id }, item),
                        )

                        return (
                          <Card key={group.id} className="gap-0">
                            <CardHeader className="border-b">
                              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                  <CardTitle>{group.name}</CardTitle>
                                  <CardDescription>{group.items.length} 个模型。</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">全部切换</span>
                                  <Switch
                                    checked={all}
                                    onCheckedChange={(on) => {
                                      group.items.forEach((item) => {
                                        setVisible({ providerID: item.provider.id, modelID: item.id }, on)
                                      })
                                    }}
                                  />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 py-6">
                              {group.items.map((item) => {
                                const on = visible({ providerID: item.provider.id, modelID: item.id }, item)

                                return (
                                  <div key={`${item.provider.id}:${item.id}`} className="rounded-2xl border px-4 py-4">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                      <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-medium">{item.name}</span>
                                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {item.id}
                                          </span>
                                          {item.def ? (
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                              默认
                                            </span>
                                          ) : null}
                                          {latest.has(modelKey({ providerID: item.provider.id, modelID: item.id })) ? (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                              最新
                                            </span>
                                          ) : null}
                                          {item.free ? (
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                              免费
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                          <span>上下文 {item.limit.context.toLocaleString()}</span>
                                          <span>{item.capabilities?.reasoning ? "支持推理" : "不支持推理"}</span>
                                          <span>{item.capabilities?.toolcall ? "支持工具" : "不支持工具"}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">{on ? "显示中" : "已隐藏"}</span>
                                        <Switch
                                          checked={on}
                                          onCheckedChange={(next) =>
                                            setVisible({ providerID: item.provider.id, modelID: item.id }, next)
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ProviderConnectDialog
        open={!!page.item}
        item={page.item}
        list={page.item ? page.list[page.item.id] : undefined}
        onOpenChange={(open) => {
          if (!open) page.setItem(undefined)
        }}
        onDone={async () => {
          await page.refresh()
          await prv.refresh()
        }}
      />

      <ProviderCustomDialog
        open={page.customOpen}
        ids={page.ids}
        cfg={page.config}
        onOpenChange={page.setCustomOpen}
        onDone={async () => {
          await page.refresh()
          await prv.refresh()
        }}
      />
    </>
  )
}
