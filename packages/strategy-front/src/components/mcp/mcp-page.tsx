"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Pencil,
  PlugZap,
  RefreshCcw,
  ServerCog,
  ShieldOff,
  Unplug,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { mcpApi } from "@/api/modules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { McpCfg, McpDoc, McpMap, McpRow, McpStatus } from "@/types/mcp"
import { McpDialog } from "./mcp-dialog"
import { enabled, isCfg, kind, oauth, sort, summary, text, tone, view } from "./utils"

type Dlg = {
  open: boolean
  mode: "create" | "edit"
  name?: string
}

type Auth = {
  name: string
  url: string
  code: string
}

const empty: McpDoc = {}
const init: McpMap = {}
function info(status?: McpStatus) {
  if (!status) return ""
  if ("error" in status && status.error) return status.error
  if (status.status === "needs_auth") {
    return "远程服务需要先完成 OAuth 授权，完成后再连接。"
  }
  return ""
}

export function McpPage() {
  const [doc, setDoc] = useState<McpDoc>(empty)
  const [map, setMap] = useState<McpMap>(init)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState("")
  const [err, setErr] = useState("")
  const [dlg, setDlg] = useState<Dlg>({
    open: false,
    mode: "create",
  })
  const [auth, setAuth] = useState<Auth>()

  const rows = useMemo(() => {
    const cfg = doc.mcp ?? {}
    const keys = Array.from(new Set([...Object.keys(cfg), ...Object.keys(map)]))
    return sort(
      keys.map(
        (name) =>
          ({
            name,
            cfg: cfg[name],
            status: map[name],
            kind: kind(cfg[name]),
            enabled: enabled(cfg[name]),
            oauth: oauth(cfg[name]),
            summary: summary(cfg[name]),
          }) satisfies McpRow,
      ),
    )
  }, [doc, map])

  const names = useMemo(() => new Set(rows.map((item) => item.name)), [rows])
  const item = useMemo(() => rows.find((entry) => entry.name === dlg.name), [dlg.name, rows])

  const stats = useMemo(
    () => ({
      all: rows.length,
      ok: rows.filter((item) => view(item) === "connected").length,
      disc: rows.filter((item) => view(item) === "disconnected").length,
      auth: rows.filter((item) => view(item) === "auth").length,
      bad: rows.filter((item) => view(item) === "issue").length,
      off: rows.filter((item) => view(item) === "disabled").length,
    }),
    [rows],
  )

  const reload = useCallback(async (spin = true) => {
    if (spin) setLoad(true)
    setErr("")

    try {
      const [doc, map] = await Promise.all([mcpApi.config(), mcpApi.status()])
      setDoc(doc)
      setMap(map)
    } catch (err) {
      setErr(text(err, "加载 MCP 服务失败"))
    } finally {
      if (spin) setLoad(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function patch(body: McpDoc) {
    await mcpApi.update(body)
  }

  async function save(name: string, cfg: McpCfg) {
    setBusy(`save:${name}`)
    try {
      await patch({
        mcp: {
          [name]: cfg,
        },
      })
      if (cfg.enabled !== false) {
        await mcpApi.connect(name).catch(() => undefined)
      } else {
        await mcpApi.disconnect(name).catch(() => undefined)
      }
      await reload(false)
      toast.success(`已保存 ${name}`)
      setDlg({
        open: false,
        mode: "create",
      })
    } catch (err) {
      toast.error(text(err, `保存 ${name} 失败`))
    } finally {
      setBusy("")
    }
  }

  async function connect(name: string) {
    setBusy(`connect:${name}`)
    try {
      await mcpApi.connect(name)
      await reload(false)
      toast.success(`已连接 ${name}`)
    } catch (err) {
      toast.error(text(err, `连接 ${name} 失败`))
    } finally {
      setBusy("")
    }
  }

  async function disconnect(name: string) {
    setBusy(`disconnect:${name}`)
    try {
      await mcpApi.disconnect(name)
      await reload(false)
      toast.success(`已断开 ${name}`)
    } catch (err) {
      toast.error(text(err, `断开 ${name} 失败`))
    } finally {
      setBusy("")
    }
  }

  async function flip(item: McpRow) {
    if (!item.cfg || !isCfg(item.cfg)) return

    const cfg = item.enabled ? { enabled: false } : { ...item.cfg, enabled: true }

    setBusy(`flip:${item.name}`)
    try {
      await patch({
        mcp: {
          [item.name]: cfg,
        },
      })
      if (item.enabled) {
        await mcpApi.disconnect(item.name).catch(() => undefined)
      } else {
        await mcpApi.connect(item.name).catch(() => undefined)
      }
      await reload(false)
      toast.success(item.enabled ? `已禁用 ${item.name}` : `已启用 ${item.name}`)
    } catch (err) {
      toast.error(text(err, `更新 ${item.name} 失败`))
    } finally {
      setBusy("")
    }
  }

  async function authRun(name: string) {
    setBusy(`auth:${name}`)
    try {
      const status = await mcpApi.authenticate(name)
      await reload(false)
      if (status.status === "connected") {
        toast.success(`${name} 已完成授权`)
        return
      }
      toast.error(info(status) || `${name} 尚未完成授权`)
    } catch (err) {
      toast.error(text(err, `${name} 自动授权失败`))
    } finally {
      setBusy("")
    }
  }

  async function authStart(name: string) {
    setBusy(`start:${name}`)
    try {
      const out = await mcpApi.authStart(name)
      setAuth({
        name,
        url: out.authorizationUrl,
        code: "",
      })
      if (out.authorizationUrl) {
        window.open(out.authorizationUrl, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      toast.error(text(err, `启动 ${name} 的授权流程失败`))
    } finally {
      setBusy("")
    }
  }

  async function authDone() {
    if (!auth?.code.trim()) return

    setBusy(`code:${auth.name}`)
    try {
      const status = await mcpApi.authCallback(auth.name, auth.code.trim())
      await reload(false)
      if (status.status === "connected") {
        toast.success(`${auth.name} 已完成授权`)
        setAuth(undefined)
        return
      }
      toast.error(info(status) || `${auth.name} 尚未完成授权`)
    } catch (err) {
      toast.error(text(err, `提交 ${auth.name} 的授权码失败`))
    } finally {
      setBusy("")
    }
  }

  async function authDrop(name: string) {
    setBusy(`drop:${name}`)
    try {
      await mcpApi.authRemove(name)
      await reload(false)
      toast.success(`已清除 ${name} 的授权信息`)
    } catch (err) {
      toast.error(text(err, `清除 ${name} 的授权信息失败`))
    } finally {
      setBusy("")
    }
  }

  function draw(list: McpRow[]) {
    if (list.length === 0) {
      return <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">暂无数据。</div>
    }

    return (
      <div className="space-y-3">
        {list.map((item) => {
          const meta = tone(item)
          const state = view(item)
          const lock = busy.endsWith(`:${item.name}`)
          const msg = info(item.status)

          return (
            <div key={item.name} className="bg-background rounded-2xl border px-5 py-4 shadow-xs">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 2xl:flex-nowrap 2xl:items-start 2xl:justify-between">
                  <div className="min-w-0 flex-1 basis-80 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold">{item.name}</div>
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                        {item.kind === "local" ? "本地" : item.kind === "remote" ? "远程" : "未知"}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.tone}`}>{meta.text}</span>
                    </div>

                    <div className="text-muted-foreground break-all text-sm leading-6">{item.summary}</div>

                    {msg ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {msg}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex basis-full flex-wrap gap-2 2xl:basis-auto 2xl:justify-end">
                    {state === "connected" ? (
                      <Button variant="outline" onClick={() => void disconnect(item.name)} disabled={lock}>
                        <Unplug className="size-4" />
                        断开连接
                      </Button>
                    ) : (
                      <Button
                        onClick={() => void connect(item.name)}
                        disabled={lock || !isCfg(item.cfg) || !item.enabled}
                      >
                        <PlugZap className="size-4" />
                        {state === "disconnected" ? "重新连接" : "连接"}
                      </Button>
                    )}

                    {item.oauth ? (
                      <Button variant="outline" onClick={() => void authRun(item.name)} disabled={lock}>
                        <CheckCircle2 className="size-4" />
                        自动授权
                      </Button>
                    ) : null}

                    {item.oauth ? (
                      <Button variant="outline" onClick={() => void authStart(item.name)} disabled={lock}>
                        <KeyRound className="size-4" />
                        手动授权
                      </Button>
                    ) : null}

                    {item.oauth ? (
                      <Button variant="outline" onClick={() => void authDrop(item.name)} disabled={lock}>
                        <ShieldOff className="size-4" />
                        清除授权
                      </Button>
                    ) : null}

                    {isCfg(item.cfg) ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setDlg({
                            open: true,
                            mode: "edit",
                            name: item.name,
                          })
                        }
                        disabled={lock}
                      >
                        <Pencil className="size-4" />
                        编辑
                      </Button>
                    ) : null}

                    {isCfg(item.cfg) ? (
                      <Button variant="outline" onClick={() => void flip(item)} disabled={lock}>
                        <Wrench className="size-4" />
                        {item.enabled ? "禁用" : "启用"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const ok = rows.filter((item) => view(item) === "connected")
  const disc = rows.filter((item) => view(item) === "disconnected")
  const auths = rows.filter((item) => view(item) === "auth")
  const bad = rows.filter((item) => view(item) === "issue")
  const off = rows.filter((item) => view(item) === "disabled")

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>MCP 管理</CardTitle>
                <CardDescription>所有改动都会写入全局配置，因此不同工作区可以复用同一套 MCP 设置。</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void reload()} disabled={load}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button
                  onClick={() =>
                    setDlg({
                      open: true,
                      mode: "create",
                    })
                  }
                >
                  <ServerCog className="size-4" />
                  新增 MCP
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">总数</div>
              <div className="mt-2 text-3xl font-semibold">{stats.all}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已连接</div>
              <div className="mt-2 text-3xl font-semibold">{stats.ok}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已断开</div>
              <div className="mt-2 text-3xl font-semibold">{stats.disc}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">待授权</div>
              <div className="mt-2 text-3xl font-semibold">{stats.auth}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">需处理</div>
              <div className="mt-2 text-3xl font-semibold">{stats.bad}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已禁用</div>
              <div className="mt-2 text-3xl font-semibold">{stats.off}</div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          配置更新采用合并模式。当前页面支持新增、编辑、启用和禁用，但不支持彻底删除某个 MCP 键, 你需要
          在~/.config/opencode 下 opencode.jsonc主动删除
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">已连接</h2>
            <p className="text-muted-foreground mt-1 text-sm">当前已连接且可用的服务。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            draw(ok)
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">已断开</h2>
            <p className="text-muted-foreground mt-1 text-sm">配置仍处于启用状态，但当前连接已关闭，可直接重新连接。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            draw(disc)
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">待授权</h2>
            <p className="text-muted-foreground mt-1 text-sm">等待完成 OAuth 授权的远程服务。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            draw(auths)
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">需处理</h2>
            <p className="text-muted-foreground mt-1 text-sm">连接失败或缺少客户端注册信息的服务。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            draw(bad)
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">已禁用</h2>
            <p className="text-muted-foreground mt-1 text-sm">仍保留在配置中，但不会参与自动连接的条目。</p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            draw(off)
          )}
        </section>
      </div>

      <McpDialog
        key={`${dlg.mode}:${dlg.name ?? "new"}:${dlg.open ? "1" : "0"}`}
        open={dlg.open}
        mode={dlg.mode}
        busy={busy.startsWith("save:")}
        item={item}
        names={names}
        onOpenChange={(open) =>
          setDlg((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { name: undefined }),
          }))
        }
        onSave={save}
      />

      <Dialog open={!!auth} onOpenChange={(open) => !open && setAuth(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动 OAuth</DialogTitle>
            <DialogDescription>打开授权地址并完成流程，然后将返回的授权码粘贴到这里。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">授权地址</div>
              <div className="bg-muted rounded-xl border px-3 py-3 text-xs break-all">{auth?.url || "-"}</div>
              {auth?.url ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(auth.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4" />
                  打开链接
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">授权码</div>
              <Input
                value={auth?.code ?? ""}
                onChange={(event) =>
                  setAuth((prev) =>
                    prev
                      ? {
                          ...prev,
                          code: event.target.value,
                        }
                      : prev,
                  )
                }
                placeholder="粘贴授权码"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuth(undefined)}
              disabled={busy.startsWith("code:")}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void authDone()}
              disabled={!auth?.code.trim() || busy.startsWith("code:")}
            >
              {busy.startsWith("code:") ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "提交授权码"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
