"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCcw, RotateCcw, Search } from "lucide-react"
import { NavLink } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useProviderList } from "@/data/global-data"
import { writeModelCatalog } from "@/lib/model-catalog"
import { load } from "@/lib/store"
import type { Model, Provider } from "@/types/provider"
import { popular, text } from "./utils"

type Vis = "show" | "hide"
type Key = {
  providerID: string
  modelID: string
}
type Row = Model & {
  provider: Provider
  def: boolean
  free: boolean
}

const storeKey = "strategy-front.provider-models.v1"
const win = 1000 * 60 * 60 * 24 * 30 * 6

function key(input: Key) {
  return `${input.providerID}:${input.modelID}`
}

function read() {
  if (typeof window === "undefined") return {}

  try {
    const raw = load(storeKey)
    if (!raw) return {}
    const data = JSON.parse(raw) as { user?: Record<string, Vis> }
    return data.user ?? {}
  } catch {
    return {}
  }
}

function stamp(value: string) {
  const ts = Date.parse(value)
  return Number.isFinite(ts) ? ts : Number.NaN
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

export function ProviderModelPage() {
  const prv = useProviderList()
  const [q, setQ] = useState("")
  const [user, setUser] = useState<Record<string, Vis>>(() => read())
  const [now] = useState(() => Date.now())
  const sync = useRef(prv.sync)
  const dq = useDeferredValue(q.trim().toLowerCase())
  const providers = prv.providers
  const load = prv.load
  const err = prv.err ? text(prv.err, "加载模型列表失败") : ""

  useEffect(() => {
    sync.current = prv.sync
  }, [prv.sync])

  useEffect(() => {
    if (typeof window === "undefined") return
    writeModelCatalog({ user })
    sync.current()
  }, [user])

  const rows = useMemo(() => {
    const ids = new Set(providers.connected)

    return providers.all
      .filter((item) => ids.has(item.id))
      .flatMap((provider) =>
        Object.values(provider.models).map((model) => ({
          ...model,
          provider,
          def: providers.default[provider.id] === model.id,
          free: provider.id === "opencode" && (!model.cost || model.cost.input === 0),
        })),
      )
  }, [providers])

  const latest = useMemo(() => {
    const grp = new Map<string, Map<string, Row[]>>()

    for (const row of rows) {
      const ts = stamp(row.release_date)
      if (!Number.isFinite(ts) || Math.abs(now - ts) >= win) continue

      const by = grp.get(row.provider.id) ?? new Map<string, Row[]>()
      const fam = row.family ?? ""
      const items = by.get(fam) ?? []
      items.push(row)
      by.set(fam, items)
      grp.set(row.provider.id, by)
    }

    const set = new Set<string>()
    for (const by of grp.values()) {
      for (const items of by.values()) {
        const row = items.slice().sort((a, b) => stamp(b.release_date) - stamp(a.release_date))[0]
        if (!row) continue
        set.add(key({ providerID: row.provider.id, modelID: row.id }))
      }
    }
    return set
  }, [now, rows])

  const visible = useCallback(
    (input: Key) => {
      const id = key(input)
      const cur = user[id]
      if (cur === "hide") return false
      if (cur === "show") return true
      if (latest.has(id)) return true

      const row = rows.find((item) => item.provider.id === input.providerID && item.id === input.modelID)
      if (!row) return false
      return !Number.isFinite(stamp(row.release_date))
    },
    [latest, rows, user],
  )

  const setVisible = (input: Key, on: boolean) => {
    const id = key(input)
    setUser((prev) => ({ ...prev, [id]: on ? "show" : "hide" }))
  }

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>()
    const name = new Map<string, string>()

    for (const row of rows) {
      if (!match(row, dq)) continue
      const items = map.get(row.provider.id) ?? []
      items.push(row)
      map.set(row.provider.id, items)
      name.set(row.provider.id, row.provider.name)
    }

    return Array.from(map.entries())
      .sort((a, b) => sortProvider(a[0], b[0], name))
      .map(([id, items]) => ({
        id,
        name: name.get(id) ?? id,
        items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [dq, rows])

  const stats = useMemo(() => {
    const models = rows.length
    const shown = rows.filter((row) => visible({ providerID: row.provider.id, modelID: row.id })).length
    return {
      providers: new Set(rows.map((row) => row.provider.id)).size,
      models,
      shown,
    }
  }, [rows, visible])

  const clear = () => {
    setUser({})
    writeModelCatalog({ user: {} })
  }

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>提供商模型</CardTitle>
                <CardDescription>浏览全局提供商模型目录，并控制当前前端展示哪些模型。</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void prv.reload()} disabled={load}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button variant="outline" onClick={clear} disabled={load || Object.keys(user).length === 0}>
                  <RotateCcw className="size-4" />
                  重置显示状态
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已连接提供商</div>
              <div className="mt-2 text-3xl font-semibold">{stats.providers}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">模型总数</div>
              <div className="mt-2 text-3xl font-semibold">{stats.models}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">当前展示</div>
              <div className="mt-2 text-3xl font-semibold">{stats.shown}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div className="space-y-2">
              <CardTitle>搜索</CardTitle>
              <CardDescription>按提供商名称、模型名称或模型 ID 过滤。</CardDescription>
            </div>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索提供商模型"
                className="pl-9"
              />
            </div>
          </CardHeader>
        </Card>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        {load ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            正在加载模型列表...
          </div>
        ) : stats.providers === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无已连接提供商</CardTitle>
              <CardDescription>请先在概览页连接至少一个提供商，再来管理模型目录。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <NavLink to="/app/providers/overview">前往提供商概览</NavLink>
              </Button>
            </CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>没有匹配的模型</CardTitle>
              <CardDescription>可以尝试更宽泛的关键词，或清空搜索条件。</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const all = group.items.every((item) => visible({ providerID: item.provider.id, modelID: item.id }))

              return (
                <Card key={group.id} className="gap-0">
                  <CardHeader className="border-b">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <CardTitle>{group.name}</CardTitle>
                        <CardDescription>{group.items.length} 个模型。</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm">全部切换</span>
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
                      const on = visible({ providerID: item.provider.id, modelID: item.id })

                      return (
                        <div key={`${item.provider.id}:${item.id}`} className="rounded-2xl border px-4 py-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                                  {item.id}
                                </span>
                                {item.def ? (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                    默认
                                  </span>
                                ) : null}
                                {latest.has(key({ providerID: item.provider.id, modelID: item.id })) ? (
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
                              <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
                                <span>上下文 {item.limit.context.toLocaleString()}</span>
                                <span>{item.capabilities?.reasoning ? "支持推理" : "不支持推理"}</span>
                                <span>{item.capabilities?.toolcall ? "支持工具" : "不支持工具"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground text-sm">{on ? "显示中" : "已隐藏"}</span>
                                <Switch
                                  checked={on}
                                  onCheckedChange={(next) =>
                                    setVisible({ providerID: item.provider.id, modelID: item.id }, next)
                                  }
                                />
                              </div>
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
    </div>
  )
}
