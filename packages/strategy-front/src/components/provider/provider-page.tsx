"use client"

import { Loader2, Plus, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoBanner, ResourceCard, ResourceSection, ResourceState, StatCards } from "@/components/shared/global-resource-section"
import { useProviderPage } from "@/hooks/use-provider-page"
import type { Provider } from "@/types/provider"
import { ProviderConnectDialog } from "./provider-connect-dialog"
import { ProviderCustomDialog } from "./provider-custom-dialog"
import { note, source } from "./utils"

/**
 * 渲染单个提供商卡片。
 */
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
        <span>{models} 个模型</span>,
        ...(props.item.env.length > 0 ? [<span>{props.item.env.length} 个环境变量</span>] : []),
        ...(props.item.api ? [<span>{props.item.api}</span>] : []),
      ]}
      actions={
        props.mode === "available" ? (
          <Button onClick={() => props.onPick(props.item)}>连接</Button>
        ) : props.item.source === "env" ? (
          <span className="text-muted-foreground text-sm">来自环境变量</span>
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

/**
 * 在提供商页面中渲染一个分组列表。
 */
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

export function ProviderPage() {
  const page = useProviderPage()
  const linked = new Set(page.providers.connected)

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>提供商</CardTitle>
                <CardDescription>管理全局提供商连接、认证方式，以及自定义 OpenAI 兼容提供商。</CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
                { label: "热门", value: page.popularList.length },
              ]}
            />
          </CardContent>
        </Card>

        <InfoBanner>已连接的 provider 会在整个应用范围内共享，断开后对应模型会立即从可选列表中移除。</InfoBanner>

        {page.err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{page.err}</div>
        ) : null}

        <ResourceSection title="已连接提供商" desc="已连接的提供商会在整个应用中暴露模型。">
          <ResourceState loading={page.load} empty={page.connected.length === 0} loading_text="正在加载提供商状态..." empty_text="暂无数据。">
            <ProviderList items={page.connected} linked={linked} busy={page.busy} mode="connected" onPick={page.setItem} onRemove={(item) => void page.remove(item)} />
          </ResourceState>
        </ResourceSection>

        <ResourceSection title="热门提供商" desc="优先展示常用提供商，支持直接发起连接。">
          <ResourceState loading={page.load} empty={page.popularList.length === 0} loading_text="正在加载..." empty_text="暂无数据。">
            <ProviderList items={page.popularList} linked={linked} busy={page.busy} mode="available" onPick={page.setItem} onRemove={(item) => void page.remove(item)} />
          </ResourceState>
        </ResourceSection>

        <ResourceSection title="更多提供商" desc="后端已识别但尚未连接的其他提供商。">
          <ResourceState loading={page.load} empty={page.other.length === 0} loading_text="正在加载..." empty_text="暂无数据。">
            <ProviderList items={page.other} linked={linked} busy={page.busy} mode="available" onPick={page.setItem} onRemove={(item) => void page.remove(item)} />
          </ResourceState>
        </ResourceSection>
      </div>

      <ProviderConnectDialog
        open={!!page.item}
        item={page.item}
        list={page.item ? page.list[page.item.id] : undefined}
        onOpenChange={(open) => {
          if (!open) page.setItem(undefined)
        }}
        onDone={async () => {
          await page.refresh()
        }}
      />

      <ProviderCustomDialog
        open={page.customOpen}
        ids={page.ids}
        cfg={page.config}
        onOpenChange={page.setCustomOpen}
        onDone={async () => {
          await page.refresh()
        }}
      />
    </div>
  )
}
