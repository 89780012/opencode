"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { providerApi } from "@/api/modules/provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProviderConnectDialog } from "./provider-connect-dialog"
import { ProviderCustomDialog } from "./provider-custom-dialog"
import { custom, note, popular, source, text } from "./utils"
import type { AuthMap, Config, List, Provider } from "@/types/provider"

const empty: List = {
  all: [],
  connected: [],
  default: {},
}

const init: Config = {}

export function ProviderPage() {
  const [list, setList] = useState<List>(empty)
  const [map, setMap] = useState<AuthMap>({})
  const [cfg, setCfg] = useState<Config>(init)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState("")
  const [err, setErr] = useState("")
  const [item, setItem] = useState<Provider>()
  const [customOpen, setCustomOpen] = useState(false)

  const connected = useMemo(() => {
    if (list.all.length === 0 || list.connected.length === 0) {
      return []
    }

    const set = new Set(list.connected)
    return list.all.filter((item) => set.has(item.id))
  }, [list])

  const popularSet = useMemo(() => new Set(popular), [])

  const popularList = useMemo(() => {
    const set = new Set(connected.map((item) => item.id))
    return list.all
      .filter((item) => popularSet.has(item.id) && !set.has(item.id))
      .sort((a, b) => popular.indexOf(a.id) - popular.indexOf(b.id))
  }, [connected, list, popularSet])

  const other = useMemo(() => {
    const set = new Set(connected.map((item) => item.id))
    return list.all.filter((item) => !set.has(item.id) && !popularSet.has(item.id))
  }, [connected, list, popularSet])

  const ids = useMemo(() => new Set(list.all.map((item) => item.id)), [list])

  async function reload() {
    setLoad(true)
    setErr("")
    try {
      const [list, map, cfg] = await Promise.all([providerApi.list(), providerApi.auth(), providerApi.config()])
      setList(list)
      setMap(map)
      setCfg(cfg)
    } catch (error) {
      setErr(text(error, "加载提供商失败"))
    } finally {
      setLoad(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function remove(item: Provider) {
    setBusy(item.id)
    try {
      if (custom(item.id, cfg)) {
        await providerApi.remove(item.id).catch(() => undefined)
        await providerApi.update({
          disabled_providers: [...new Set([...(cfg.disabled_providers ?? []), item.id])],
        })
      } else {
        await providerApi.remove(item.id)
        await providerApi.dispose()
      }
      await reload()
      toast.success(`${item.name} 已断开`)
    } catch (error) {
      toast.error(text(error, "断开提供商失败"))
    } finally {
      setBusy("")
    }
  }

  function renderList(items: Provider[], mode: "connected" | "available") {
    if (items.length === 0) {
      return <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">暂无数据。</div>
    }

    return (
      <div className="space-y-3">
        {items.map((item) => {
          const linked = list.connected.includes(item.id)
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
                    {linked && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        {source(item)}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                    <span>{models} 个模型</span>
                    {item.env.length > 0 && <span>{item.env.length} 个环境变量入口</span>}
                    {item.api && <span>{item.api}</span>}
                  </div>
                  {msg && <p className="text-muted-foreground mt-3 text-sm leading-6">{msg}</p>}
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
                <CardTitle>提供商管理</CardTitle>
                <CardDescription>
                  查看当前已连接的提供商，发起 OAuth 或 API 密钥认证，并添加自定义兼容 OpenAI 的提供商。
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void reload()} disabled={load}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button onClick={() => setCustomOpen(true)}>
                  <Plus className="size-4" />
                  自定义提供商
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
              <div className="mt-2 text-3xl font-semibold">{list.all.length - connected.length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">热门提供商</div>
              <div className="mt-2 text-3xl font-semibold">{popularList.length}</div>
            </div>
          </CardContent>
        </Card>

        {err && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">已连接的提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">连接后，对应模型才会进入可用集合。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载提供商状态...
            </div>
          ) : (
            renderList(connected, "connected")
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">热门提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">优先展示常用提供商，支持直接进入认证流程。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载...
            </div>
          ) : (
            renderList(popularList, "available")
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">更多提供商</h2>
            <p className="text-muted-foreground mt-1 text-sm">这里展示服务端当前可识别但尚未连接的其余提供商。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载...
            </div>
          ) : (
            renderList(other, "available")
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
        onDone={reload}
      />

      <ProviderCustomDialog open={customOpen} ids={ids} cfg={cfg} onOpenChange={setCustomOpen} onDone={reload} />
    </div>
  )
}
