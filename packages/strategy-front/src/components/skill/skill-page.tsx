import { useMemo } from "react"
import { Pencil, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react"
import { skillApi } from "@/api/modules"
import { InfoBanner, ResourceCard, ResourceSection, ResourceState, StatCards } from "@/components/shared/global-resource-section"
import { MarkdownEditorDialog } from "@/components/shared/markdown-editor-dialog"
import { useGlobalData } from "@/data/global-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGlobalMarkdown } from "@/hooks/use-global-markdown"
import { stamp } from "@/lib/global-markdown"
import type { GlobalSkill } from "@/types/skill"

/**
 * 生成新的 skill 模板内容。
 */
function temp(name: string) {
  const id = name.trim() || "my-skill"
  return `---
name: "${id}"
description: describe when this skill should be used
---

# ${id}

## Overview

Describe the process, constraints, and expected outcome for this skill.
`
}

/**
 * 从 SKILL.md 头部提取 description 字段。
 */
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
  const { refresh, skill } = useGlobalData()
  const form = useGlobalMarkdown<GlobalSkill>({
    key: "skill",
    temp,
    create: skillApi.createGlobal,
    update: skillApi.updateGlobal,
    remove: skillApi.removeGlobal,
    reload: ["agent", "provider", "mcp"],
    text: {
      title: "Skill",
      label: "skill ",
      content: "请先填写 SKILL.md 内容",
      create_ok: "已创建全局 skill，请重启 opencode 服务重新加载",
      update_ok: "已更新全局 skill，请重启 opencode 服务重新加载",
      save_err: "保存 skill 失败",
      remove_ok: (name) => `已删除 ${name}，请重启 opencode 服务重新加载`,
      remove_err: (name) => `删除 ${name} 失败`,
      restart_ok: "opencode 服务已重启",
      restart_err: "重启 opencode 服务失败",
    },
  })
  const run = skill.data.run
  const cfg = skill.data.cfg
  const load = skill.load
  const err = skill.err
  const cur = form.dlg.item

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
                <Button variant="outline" onClick={() => void refresh("skill")} disabled={load || form.busy === "restart"}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button variant="outline" onClick={() => void form.restart()} disabled={form.busy === "restart"}>
                  <RotateCcw className={form.busy === "restart" ? "size-4 animate-spin" : "size-4"} />
                  重启 opencode
                </Button>
                <Button onClick={() => form.open()}>
                  <Plus className="size-4" />
                  新建 skill
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StatCards
              items={[
                { label: "当前生效", value: stat.run },
                { label: "自定义全局", value: stat.cfg },
                { label: "带描述", value: stat.desc },
              ]}
            />
          </CardContent>
        </Card>

        <InfoBanner>
          <div>
            全局 skill 文件路径：
            <code>{cfg.root || "~/.config/opencode/skills"}</code>
          </div>
          <div>
            每个自定义 skill 都会写入
            <code>{` <name>/SKILL.md`}</code>。
          </div>
          <div>保存后不会自动刷新当前生效列表，请重启 opencode 服务重新加载。</div>
        </InfoBanner>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        <ResourceSection
          title="自定义全局 Skill"
          desc={
            <>
              这里只管理写入全局配置目录的自定义
              <code className="mx-1">SKILL.md</code>
              文件。
            </>
          }
        >
          <ResourceState loading={load} empty={cfg.skills.length === 0} loading_text="正在加载全局 skill 文件..." empty_text="还没有自定义全局 skill。">
            <div className="space-y-3">
              {cfg.skills.map((item) => {
                const lock = form.busy === `drop:${item.name}`
                return (
                  <ResourceCard
                    key={item.path}
                    title={item.name}
                    badges={["自定义"]}
                    desc={item.description || desc(item.content) || "未提供描述"}
                    meta={[<>{item.path}</>, <>更新于：{stamp(item.updated_at)}</>]}
                    actions={
                      <>
                        <Button variant="outline" onClick={() => form.open(item)} disabled={lock}>
                          <Pencil className="size-4" />
                          编辑
                        </Button>
                        <Button variant="destructive" onClick={() => void form.drop(item)} disabled={lock}>
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </>
                    }
                  />
                )
              })}
            </div>
          </ResourceState>
        </ResourceSection>

        <ResourceSection
          title="当前生效 Skill 列表"
          desc={
            <>
              这里直接展示 opencode <code>/skill</code> 返回的当前可用 skills。
            </>
          }
        >
          <ResourceState loading={load} empty={run.length === 0} loading_text="正在加载当前 skill 列表..." empty_text="当前没有可用 skill。">
            <div className="space-y-3">
              {run.map((item) => (
                <ResourceCard
                  key={`${item.name}:${item.location}`}
                  title={item.name}
                  badges={["运行时"]}
                  desc={item.description || "未提供描述"}
                  meta={[<>{item.location}</>]}
                />
              ))}
            </div>
          </ResourceState>
        </ResourceSection>
      </div>

      <MarkdownEditorDialog
        open={form.dlg.open}
        busy={form.busy === "save"}
        mode={form.dlg.mode}
        title={form.dlg.mode === "create" ? "新建全局 Skill" : `编辑 ${cur?.name}`}
        name_title="Skill 名称"
        name={form.name}
        body_title="SKILL.md"
        body={form.body}
        placeholder="例如：my-skill"
        hint={`将写入 ~/.config/opencode/skills/${form.name || "<name>"}/SKILL.md`}
        desc="这里直接编辑目标 SKILL.md 文件。保存后请重启 opencode 服务重新加载。"
        onOpenChange={(open) => {
          if (!open) {
            form.close()
          }
        }}
        onName={form.rename}
        onBody={form.setBody}
        onClose={form.close}
        onSave={() => {
          void form.save()
        }}
      />
    </div>
  )
}
