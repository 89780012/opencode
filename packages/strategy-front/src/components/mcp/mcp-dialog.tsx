"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { McpCfg, McpOAuth, McpRow } from "@/types/mcp"
import { isCfg, isRemote } from "./utils"

type Mode = "create" | "edit"

type Pair = {
  row: string
  key: string
  value: string
}

type Form = {
  name: string
  kind: "local" | "remote"
  enabled: boolean
  timeout: string
  cmd: string
  env: Pair[]
  url: string
  hdr: Pair[]
  oauth: "auto" | "off" | "custom"
  client: string
  secret: string
  scope: string
  err: Record<string, string>
}

type Props = {
  open: boolean
  mode: Mode
  busy: boolean
  item?: McpRow
  names: Set<string>
  onOpenChange: (open: boolean) => void
  onSave: (name: string, cfg: McpCfg) => Promise<void>
}

let seq = 0

function row(key = "", value = ""): Pair {
  seq += 1
  return {
    row: `row-${seq}`,
    key,
    value,
  }
}

function pairs(input?: Record<string, string>) {
  const list = Object.entries(input ?? {}).map(([key, value]) => row(key, value))
  return list.length > 0 ? list : [row()]
}

function make(item?: McpRow): Form {
  if (!item?.cfg || !isCfg(item.cfg)) {
    return {
      name: "",
      kind: "local",
      enabled: true,
      timeout: "",
      cmd: "",
      env: [row()],
      url: "",
      hdr: [row()],
      oauth: "auto",
      client: "",
      secret: "",
      scope: "",
      err: {},
    }
  }

  const cfg = item.cfg
  const auth = isRemote(cfg) ? cfg.oauth : undefined

  return {
    name: item.name,
    kind: cfg.type,
    enabled: cfg.enabled !== false,
    timeout: cfg.timeout ? String(cfg.timeout) : "",
    cmd: cfg.type === "local" ? cfg.command.join("\n") : "",
    env: cfg.type === "local" ? pairs(cfg.environment) : [row()],
    url: cfg.type === "remote" ? cfg.url : "",
    hdr: cfg.type === "remote" ? pairs(cfg.headers) : [row()],
    oauth:
      cfg.type !== "remote"
        ? "auto"
        : auth === false
          ? "off"
          : auth && typeof auth === "object"
            ? "custom"
            : "auto",
    client: cfg.type === "remote" && auth && typeof auth === "object" ? auth.clientId ?? "" : "",
    secret: cfg.type === "remote" && auth && typeof auth === "object" ? auth.clientSecret ?? "" : "",
    scope: cfg.type === "remote" && auth && typeof auth === "object" ? auth.scope ?? "" : "",
    err: {},
  }
}

function map(rows: Pair[]) {
  return Object.fromEntries(
    rows
      .map((item) => [item.key.trim(), item.value.trim()] as const)
      .filter(([key, value]) => key && value),
  )
}

function parse(form: Form, mode: Mode, names: Set<string>, current?: string) {
  const name = form.name.trim()
  const timeout = form.timeout.trim()
  const err: Record<string, string> = {}

  if (!name) {
    err.name = "请输入服务名称"
  } else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    err.name = "仅支持字母、数字、点号、短横线和下划线"
  } else if (mode === "create" && names.has(name)) {
    err.name = "服务名称已存在"
  } else if (mode === "edit" && current && name !== current) {
    err.name = "暂不支持重命名"
  }

  const ms = timeout ? Number(timeout) : undefined
  if (timeout && (!Number.isInteger(ms) || Number(ms) <= 0)) {
    err.timeout = "超时时间必须为正整数"
  }

  if (form.kind === "local") {
    const cmd = form.cmd
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)

    if (cmd.length === 0) {
      err.cmd = "请至少输入一行命令"
    }

    if (Object.keys(err).length > 0) {
      return { err }
    }

    const env = map(form.env)
    return {
      err,
      name,
      cfg: {
        type: "local" as const,
        command: cmd,
        ...(Object.keys(env).length > 0 ? { environment: env } : {}),
        ...(form.enabled ? {} : { enabled: false }),
        ...(ms ? { timeout: ms } : {}),
      },
    }
  }

  const url = form.url.trim()
  if (!url) {
    err.url = "请输入服务地址"
  } else if (!/^https?:\/\//.test(url)) {
    err.url = "URL 必须以 http:// 或 https:// 开头"
  }

  if (form.oauth === "custom" && !form.client.trim()) {
    err.client = "请输入客户端 ID"
  }

  if (Object.keys(err).length > 0) {
    return { err }
  }

  const hdr = map(form.hdr)
  const oauth: false | McpOAuth | undefined =
    form.oauth === "off"
      ? false
      : form.oauth === "custom"
        ? {
            clientId: form.client.trim(),
            ...(form.secret.trim() ? { clientSecret: form.secret.trim() } : {}),
            ...(form.scope.trim() ? { scope: form.scope.trim() } : {}),
          }
        : undefined

  return {
    err,
    name,
    cfg: {
      type: "remote" as const,
      url,
      ...(Object.keys(hdr).length > 0 ? { headers: hdr } : {}),
      ...(oauth !== undefined ? { oauth } : {}),
      ...(form.enabled ? {} : { enabled: false }),
      ...(ms ? { timeout: ms } : {}),
    },
  }
}

export function McpDialog(props: Props) {
  const [form, setForm] = useState<Form>(() => make(props.item))

  function close(open: boolean) {
    props.onOpenChange(open)
    if (!open) {
      setForm(make())
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const out = parse(form, props.mode, props.names, props.item?.name)

    setForm((prev) => ({
      ...prev,
      err: out.err,
    }))

    if (!("cfg" in out) || !out.cfg) {
      return
    }

    await props.onSave(out.name, out.cfg)
  }

  return (
    <Dialog open={props.open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "新增 MCP 服务" : "编辑 MCP 服务"}</DialogTitle>
          <DialogDescription>
            这里直接使用 opencode 的运行时配置结构。支持新增、编辑、启用和禁用，暂不支持重命名。
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={save}>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mcp-name">名称</Label>
                  <Input
                    id="mcp-name"
                    value={form.name}
                    disabled={props.mode === "edit"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                        err: {
                          ...prev.err,
                          name: "",
                        },
                      }))
                    }
                    placeholder="filesystem"
                  />
                  {form.err.name ? <p className="text-sm text-red-600">{form.err.name}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mcp-timeout">超时时间（毫秒）</Label>
                  <Input
                    id="mcp-timeout"
                    value={form.timeout}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        timeout: event.target.value,
                        err: {
                          ...prev.err,
                          timeout: "",
                        },
                      }))
                    }
                    placeholder="30000"
                  />
                  {form.err.timeout ? <p className="text-sm text-red-600">{form.err.timeout}</p> : null}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">启用</div>
                  <p className="text-muted-foreground text-xs">禁用后仍会保留在配置中，但不会自动连接。</p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      enabled: value,
                    }))
                  }
                />
              </div>

              <Tabs
                value={form.kind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: value === "remote" ? "remote" : "local",
                  }))
                }
              >
                <TabsList>
                  <TabsTrigger value="local">本地</TabsTrigger>
                  <TabsTrigger value="remote">远程</TabsTrigger>
                </TabsList>

                <TabsContent value="local" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-cmd">命令，每行一个参数</Label>
                    <textarea
                      id="mcp-cmd"
                      className="border-input min-h-36 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      value={form.cmd}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          cmd: event.target.value,
                          err: {
                            ...prev.err,
                            cmd: "",
                          },
                        }))
                      }
                      placeholder={"npx\n-y\n@modelcontextprotocol/server-filesystem\nC:\\\\workspace"}
                    />
                    {form.err.cmd ? <p className="text-sm text-red-600">{form.err.cmd}</p> : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>环境变量</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            env: [...prev.env, row()],
                          }))
                        }
                      >
                        <Plus className="size-4" />
                        添加变量
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.env.map((item, idx) => (
                        <div key={item.row} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={item.key}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                env: prev.env.map((row, i) =>
                                  i === idx ? { ...row, key: event.target.value } : row,
                                ),
                              }))
                            }
                            placeholder="API_KEY"
                          />
                          <Input
                            value={item.value}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                env: prev.env.map((row, i) =>
                                  i === idx ? { ...row, value: event.target.value } : row,
                                ),
                              }))
                            }
                            placeholder="secret"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={form.env.length === 1}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                env: prev.env.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="remote" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-url">服务地址</Label>
                    <Input
                      id="mcp-url"
                      value={form.url}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          url: event.target.value,
                          err: {
                            ...prev.err,
                            url: "",
                          },
                        }))
                      }
                      placeholder="https://example.com/mcp"
                    />
                    {form.err.url ? <p className="text-sm text-red-600">{form.err.url}</p> : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>请求头</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            hdr: [...prev.hdr, row()],
                          }))
                        }
                      >
                        <Plus className="size-4" />
                        添加请求头
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.hdr.map((item, idx) => (
                        <div key={item.row} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={item.key}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                hdr: prev.hdr.map((row, i) =>
                                  i === idx ? { ...row, key: event.target.value } : row,
                                ),
                              }))
                            }
                            placeholder="Authorization"
                          />
                          <Input
                            value={item.value}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                hdr: prev.hdr.map((row, i) =>
                                  i === idx ? { ...row, value: event.target.value } : row,
                                ),
                              }))
                            }
                            placeholder="Bearer ..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={form.hdr.length === 1}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                hdr: prev.hdr.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>授权方式</Label>
                    <Select
                      value={form.oauth}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          oauth: value === "off" ? "off" : value === "custom" ? "custom" : "auto",
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择授权模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自动识别</SelectItem>
                        <SelectItem value="off">禁用授权</SelectItem>
                        <SelectItem value="custom">自定义客户端</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.oauth === "custom" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="mcp-client">客户端 ID</Label>
                        <Input
                          id="mcp-client"
                          value={form.client}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              client: event.target.value,
                              err: {
                                ...prev.err,
                                client: "",
                              },
                            }))
                          }
                          placeholder="client-id"
                        />
                        {form.err.client ? <p className="text-sm text-red-600">{form.err.client}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mcp-secret">客户端密钥</Label>
                        <Input
                          id="mcp-secret"
                          value={form.secret}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              secret: event.target.value,
                            }))
                          }
                          placeholder="client-secret"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="mcp-scope">权限范围</Label>
                        <Input
                          id="mcp-scope"
                          value={form.scope}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              scope: event.target.value,
                            }))
                          }
                          placeholder="read write"
                        />
                      </div>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={props.busy}>
              取消
            </Button>
            <Button type="submit" disabled={props.busy}>
              {props.busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
