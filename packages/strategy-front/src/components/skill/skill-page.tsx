import { useCallback, useEffect, useMemo, useState } from "react"
import { FileCode2, Loader2, Pencil, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { skillApi, systemApi } from "@/api/modules"
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
import type { GlobalSkill, GlobalSkillCatalog, RuntimeSkill } from "@/types/skill"

type Dlg = {
  open: boolean
  mode: "create" | "edit"
  item?: GlobalSkill
}

const empty: GlobalSkillCatalog = {
  root: "",
  skills: [],
}

const rule = /^[a-z0-9][a-z0-9_-]*$/
const digit = /^\d+$/

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

function stamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function temp(name: string) {
  const id = name.trim() || "my-skill"
  return `---
name: "${id}"
description: Describe when this skill should be used
---

# ${id}

## Overview

Describe the workflow, constraints, and expected outcome for this skill.
`
}

function wait(ms: number) {
  return new Promise((done) => window.setTimeout(done, ms))
}

function desc(input: string) {
  const text = input.replaceAll("\r\n", "\n")
  if (!text.startsWith("---\n")) {
    return ""
  }

  const rest = text.slice(4)
  const end = rest.indexOf("\n---\n")
  if (end < 0) {
    return ""
  }

  for (const line of rest.slice(0, end).split("\n")) {
    const item = line.trim()
    if (!item.toLowerCase().startsWith("description:")) {
      continue
    }
    return item
      .slice("description:".length)
      .trim()
      .replace(/^['"]|['"]$/g, "")
  }

  return ""
}

export function SkillPage() {
  const [run, setRun] = useState<RuntimeSkill[]>([])
  const [cfg, setCfg] = useState<GlobalSkillCatalog>(empty)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState("")
  const [err, setErr] = useState("")
  const [dlg, setDlg] = useState<Dlg>({
    open: false,
    mode: "create",
  })
  const [name, setName] = useState("")
  const [body, setBody] = useState(temp(""))

  const cur = dlg.item

  const reload = useCallback(async (spin: boolean = true) => {
    if (spin) {
      setLoad(true)
    }
    setErr("")

    const [run, cfg] = await Promise.allSettled([skillApi.listRuntime(), skillApi.listGlobal()])
    const msg: string[] = []

    if (run.status === "fulfilled") {
      setRun(run.value)
    } else {
      setRun([])
      msg.push(`当前生效 skill 列表加载失败：${note(run.reason, "请求失败")}`)
    }

    if (cfg.status === "fulfilled") {
      setCfg(cfg.value)
    } else {
      setCfg(empty)
      msg.push(`全局 skill 文件加载失败：${note(cfg.reason, "请求失败")}`)
    }

    if (msg.length > 0) {
      setErr(msg.join("；"))
    }

    if (spin) {
      setLoad(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const sync = useCallback(async () => {
    for (const _ of Array.from({ length: 8 })) {
      const [run, cfg] = await Promise.allSettled([skillApi.listRuntime(), skillApi.listGlobal()])
      if (run.status === "fulfilled") {
        setRun(run.value)
      }
      if (cfg.status === "fulfilled") {
        setCfg(cfg.value)
      }
      if (run.status === "fulfilled" && cfg.status === "fulfilled") {
        setErr("")
        return true
      }
      await wait(500)
    }

    await reload(false)
    return false
  }, [reload])

  const open = useCallback((item?: GlobalSkill) => {
    if (item) {
      setDlg({
        open: true,
        mode: "edit",
        item,
      })
      setName(item.name)
      setBody(item.content)
      return
    }

    setDlg({
      open: true,
      mode: "create",
    })
    setName("")
    setBody(temp(""))
  }, [])

  const close = useCallback(() => {
    setDlg({
      open: false,
      mode: "create",
    })
    setName("")
    setBody(temp(""))
  }, [])

  const rename = useCallback(
    (next: string) => {
      setName(next)
      if (dlg.mode !== "create") {
        return
      }

      if (body !== temp(name)) {
        return
      }

      setBody(temp(next))
    },
    [body, dlg.mode, name],
  )

  const save = useCallback(async () => {
    const id = name.trim().toLowerCase()
    if (!id) {
      toast.error("Please enter a skill name")
      return
    }

    if (!rule.test(id)) {
      toast.error("skill 名称只能包含小写字母、数字、- 和 _")
      return
    }

    if (digit.test(id)) {
      toast.error("skill 名称不能是纯数字")
      return
    }
    if (!body.trim()) {
      toast.error("请先填写 SKILL.md 内容")
      return
    }

    setBusy("save")
    try {
      if (dlg.mode === "create") {
        await skillApi.createGlobal({
          name: id,
          content: body,
        })
        toast.success("已创建全局 skill，请重启 opencode 服务重新加载")
      } else {
        await skillApi.updateGlobal(id, {
          content: body,
        })
        toast.success("已更新全局 skill，请重启 opencode 服务重新加载")
      }
      close()
      await reload(false)
    } catch (err) {
      toast.error(note(err, "保存 skill 失败"))
    } finally {
      setBusy("")
    }
  }, [body, close, dlg.mode, name, reload])

  const drop = useCallback(
    async (item: GlobalSkill) => {
      setBusy(`drop:${item.name}`)
      try {
        await skillApi.removeGlobal(item.name)
        toast.success(`已删除 ${item.name}，请重启 opencode 服务重新加载`)
        await reload(false)
      } catch (err) {
        toast.error(note(err, `删除 ${item.name} 失败`))
      } finally {
        setBusy("")
      }
    },
    [reload],
  )

  const restart = useCallback(async () => {
    setBusy("restart")
    try {
      await systemApi.opencodeRestart()
      await sync()
      toast.success("opencode 服务已重启")
      await reload(false)
    } catch (err) {
      toast.error(note(err, "重启 opencode 服务失败"))
    } finally {
      setBusy("")
    }
  }, [reload])

  const stat = useMemo(
    () => ({
      run: run.length,
      cfg: cfg.skills.length,
      desc: cfg.skills.filter((item) => item.description || desc(item.content)).length,
    }),
    [cfg.skills, run.length],
  )

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>全局 Skills</CardTitle>
                <CardDescription>
                  当前页分成两部分：一部分展示 opencode
                  <code className="mx-1">/skill</code>
                  返回的当前生效列表，另一部分管理自定义全局
                  <code className="mx-1">SKILL.md</code>
                  文件。
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void reload()} disabled={load || busy === "restart"}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button variant="outline" onClick={() => void restart()} disabled={busy === "restart"}>
                  <RotateCcw className={busy === "restart" ? "size-4 animate-spin" : "size-4"} />
                  重启 opencode
                </Button>
                <Button onClick={() => open()}>
                  <Plus className="size-4" />
                  新建 Skill
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">当前生效</div>
              <div className="mt-2 text-3xl font-semibold">{stat.run}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">自定义全局</div>
              <div className="mt-2 text-3xl font-semibold">{stat.cfg}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">带描述</div>
              <div className="mt-2 text-3xl font-semibold">{stat.desc}</div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          <div>
            全局 skill 文件路径：
            <code>{cfg.root || "~/.config/opencode/skills"}</code>
          </div>
          <div>
            每个自定义 skill 都会写入
            <code>{` <name>/SKILL.md`}</code>。
          </div>
          <div>保存后不会自动刷新当前生效列表，请重启 opencode 服务重新加载。</div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">自定义全局 Skill</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              这里只管理写入全局配置目录的自定义
              <code className="mx-1">SKILL.md</code>
              文件。
            </p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载全局 skill 文件...
            </div>
          ) : cfg.skills.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">
              还没有自定义全局 skill。
            </div>
          ) : (
            <div className="space-y-3">
              {cfg.skills.map((item) => {
                const lock = busy === `drop:${item.name}`
                return (
                  <div key={item.path} className="bg-background rounded-2xl border px-5 py-4 shadow-xs">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold">{item.name}</div>
                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                            custom
                          </span>
                        </div>
                        <div className="text-muted-foreground text-sm leading-6">
                          {item.description || desc(item.content) || "未提供描述"}
                        </div>
                        <div className="text-muted-foreground break-all text-xs">{item.path}</div>
                        <div className="text-muted-foreground text-xs">更新于：{stamp(item.updated_at)}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => open(item)} disabled={lock}>
                          <Pencil className="size-4" />
                          编辑
                        </Button>
                        <Button variant="destructive" onClick={() => void drop(item)} disabled={lock}>
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">当前生效 Skill 列表</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              这里直接展示 opencode <code>/skill</code> 返回的当前可用 skills。
            </p>
          </div>
          {load ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              正在加载当前 skill 列表...
            </div>
          ) : run.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">
              当前没有可用 skill。
            </div>
          ) : (
            <div className="space-y-3">
              {run.map((item) => (
                <div
                  key={`${item.name}:${item.location}`}
                  className="bg-background rounded-2xl border px-5 py-4 shadow-xs"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold">{item.name}</div>
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">runtime</span>
                    </div>
                    <div className="text-muted-foreground text-sm leading-6">{item.description || "未提供描述"}</div>
                    <div className="text-muted-foreground break-all text-xs">{item.location}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={dlg.open} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dlg.mode === "create" ? "新建全局 Skill" : `编辑 ${cur?.name}`}</DialogTitle>
            <DialogDescription>
              这里直接编辑目标 <code>SKILL.md</code> 文件。保存后请重启 opencode 服务重新加载。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Skill 名称</div>
              <Input
                value={name}
                onChange={(event) => rename(event.target.value)}
                placeholder="例如：my-skill"
                disabled={dlg.mode === "edit"}
              />
              <div className="text-muted-foreground text-xs leading-5">
                将写入 <code>{`~/.config/opencode/skills/${name || "<name>"}/SKILL.md`}</code>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCode2 className="size-4" />
                SKILL.md
              </div>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-[420px] w-full rounded-md border bg-transparent px-3 py-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                spellCheck={false}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={busy === "save"}>
              取消
            </Button>
            <Button type="button" onClick={() => void save()} disabled={busy === "save"}>
              {busy === "save" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中...
                </>
              ) : dlg.mode === "create" ? (
                "创建"
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
