"use client"

import { useMemo, useState } from "react"
import { Loader2, Plus, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { providerApi } from "@/api/modules/provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProviderList } from "@/components/data/global-data-provider"
import type { Provider } from "@/types/provider"
import { ProviderConnectDialog } from "./provider-connect-dialog"
import { ProviderCustomDialog } from "./provider-custom-dialog"
import { custom, note, popular, source, text } from "./utils"

export function ProviderPage() {
  const prv = useProviderList()
  const refresh = prv.refresh
  const [busy, setBusy] = useState("")
  const [item, setItem] = useState<Provider>()
  const [customOpen, setCustomOpen] = useState(false)
  const map = prv.auth
  const providers = prv.providers
  const config = prv.config
  const load = prv.load
  const err = prv.err

  const connected = useMemo(() => {
    if (providers.all.length === 0 || providers.connected.length === 0) return []
    const ids = new Set(providers.connected)
    return providers.all.filter((item) => ids.has(item.id))
  }, [providers])

  const hot = useMemo(() => new Set(popular), [])

  const popularList = useMemo(() => {
    const ids = new Set(connected.map((item) => item.id))
    return providers.all
      .filter((item) => hot.has(item.id) && !ids.has(item.id))
      .sort((a, b) => popular.indexOf(a.id) - popular.indexOf(b.id))
  }, [connected, hot, providers])

  const other = useMemo(() => {
    const ids = new Set(connected.map((item) => item.id))
    return providers.all.filter((item) => !ids.has(item.id) && !hot.has(item.id))
  }, [connected, hot, providers])

  const ids = useMemo(() => new Set(providers.all.map((item) => item.id)), [providers])

  async function remove(item: Provider) {
    setBusy(item.id)
    try {
      if (custom(item.id, config)) {
        await providerApi.remove(item.id).catch(() => undefined)
        await providerApi.update({
          disabled_providers: [...new Set([...(config.disabled_providers ?? []), item.id])],
        })
      } else {
        await providerApi.remove(item.id)
        await providerApi.dispose()
      }
      await refresh()
      toast.success(`${item.name} 已断开`)
    } catch (err) {
      toast.error(text(err, "断开提供商失败"))
    } finally {
      setBusy("")
    }
  }

  function render(items: Provider[], mode: "connected" | "available") {
    if (items.length === 0) {
      return <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">暂无数据。</div>
    }

    return (
      <div className="space-y-3">
        {items.map((item) => {
          const linked = providers.connected.includes(item.id)
          const models = Object.keys(item.models ?? {}).length
          const lock = busy === item.id
          const msg = note(item.id)
          return (
            <div key={item.id} className="bg-background rounded-2xl border px-5 py-4 shadow-xs">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold">{item.name}</div>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">{item.id}</span>
                    {linked ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        {source(item)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                    <span>{models} 个模型</span>
                    {item.env.length > 0 ? <span>{item.env.length} 个环境变量</span> : null}
                    {item.api ? <span>{item.api}</span> : null}
                  </div>
                  {msg ? <p className="text-muted-foreground mt-3 text-sm leading-6">{msg}</p> : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {mode === "available" ? (
                    <Button onClick={() => setItem(item)}>连接</Button>
                  ) : item.source === "env" ? (
                    <span className="text-muted-foreground text-sm">来自环境变量</span>
                  ) : (
                    <Button variant="outline" onClick={() => void remove(item)} disabled={lock}>
                      {lock ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        "断开"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>提供商</CardTitle>
                <CardDescription>
                  管理全局提供商连接、认证方式，以及自定义 OpenAI 兼容提供商。
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void refresh()} disabled={load}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button onClick={() => setCustomOpen(true)}>
                  <Plus className="size-4" />
                  添加自定义提供商
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已连接</div>
              <div className="mt-2 text-3xl font-semibold">{connected.length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">可连接</div>
              <div className="mt-2 text-3xl font-semibold">{providers.all.length - connected.length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">热门</div>
              <div className="mt-2 text-3xl font-semibold">{popularList.length}</div>
            </div>
          </CardContent>
        </Card>

        {err ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">已连接提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">已连接的提供商会在整个应用中暴露模型。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载提供商状态...
            </div>
          ) : (
            render(connected, "connected")
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">热门提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">优先展示常用提供商，支持直接发起连接。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载...
            </div>
          ) : (
            render(popularList, "available")
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">更多提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">后端已识别但尚未连接的其他提供商。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载...
            </div>
          ) : (
            render(other, "available")
          )}
        </section>
      </div>

      <ProviderConnectDialog
        open={!!item}
        item={item}
        list={item ? map[item.id] : undefined}
        onOpenChange={(open) => {
          if (!open) setItem(undefined)
        }}
        onDone={async () => {
          await refresh()
        }}
      />

      <ProviderCustomDialog
        open={customOpen}
        ids={ids}
        cfg={config}
        onOpenChange={setCustomOpen}
        onDone={async () => {
          await refresh()
        }}
      />
    </div>
  )
}