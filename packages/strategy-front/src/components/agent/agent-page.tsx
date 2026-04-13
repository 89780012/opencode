import { useMemo } from "react"
import { Pencil, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react"
import { agentApi } from "@/api/modules"
import { InfoBanner, ResourceCard, ResourceSection, ResourceState, StatCards } from "@/components/shared/global-resource-section"
import { MarkdownEditorDialog } from "@/components/shared/markdown-editor-dialog"
import { useGlobalData } from "@/data/global-data-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGlobalMarkdown } from "@/hooks/use-global-markdown"
import { stamp } from "@/lib/global-markdown"
import type { GlobalAgent, RuntimeAgent } from "@/types/agent"

/**
 * 生成新的 agent 模板内容。
 */
function temp(name: string) {
  const id = name.trim() || "my-agent"
  return `---
description: 描述这个 agent 的使用场景
mode: all
---

# ${id}

你是一个专门处理某类任务的 agent。
请在这里补充这个 agent 的职责、边界和工作方式。
`
}

/**
 * 将运行时 agent 标记为内置或自定义。
 */
function tag(item: RuntimeAgent) {
  if (item.native) {
    return "内置"
  }

  return "自定义"
}

/**
 * 格式化运行模式文案。
 */
function modeText(mode: RuntimeAgent["mode"]) {
  if (mode === "primary") {
    return "主智能体"
  }
  if (mode === "subagent") {
    return "子智能体"
  }
  return "通用"
}

/**
 * 将模型对象整理为可读字符串。
 */
function modelText(model?: RuntimeAgent["model"] | string) {
  if (!model) {
    return ""
  }
  if (typeof model === "string") {
    return model
  }
  return `${model.providerID}/${model.modelID}`
}

export function AgentPage() {
  const { agent, refresh } = useGlobalData()
  const form = useGlobalMarkdown<GlobalAgent>({
    key: "agent",
    temp,
    create: agentApi.createGlobal,
    update: agentApi.updateGlobal,
    remove: agentApi.removeGlobal,
    reload: ["provider", "mcp", "skill"],
    text: {
      title: "Agent",
      label: "agent ",
      content: "请先填写 agent Markdown 内容",
      create_ok: "已创建全局 agent，请重启 opencode 服务重新加载",
      update_ok: "已更新全局 agent，请重启 opencode 服务重新加载",
      save_err: "保存 agent 失败",
      remove_ok: (name) => `已删除 ${name}，请重启 opencode 服务重新加载`,
      remove_err: (name) => `删除 ${name} 失败`,
      restart_ok: "opencode 已重启",
      restart_err: "重启 opencode 失败",
    },
  })
  const run = agent.data.run
  const cfg = agent.data.cfg
  const load = agent.load
  const err = agent.err
  const cur = form.dlg.item

  const stat = useMemo(
    () => ({
      run: run.length,
      cfg: cfg.agents.length,
      primary: run.filter((item) => item.mode === "primary").length,
      sub: run.filter((item) => item.mode === "subagent").length,
    }),
    [cfg.agents.length, run],
  )

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>全局 Agents</CardTitle>
                <CardDescription>
                  当前页面分成两部分：一部分展示 opencode 当前服务加载到的全局可用 agent 列表，另一部分管理
                  <code className="mx-1">~/.config/opencode/agents</code>
                  下的全局 Markdown agent 文件。
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void refresh("agent")} disabled={load || form.busy === "restart"}>
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button variant="outline" onClick={() => void form.restart()} disabled={form.busy === "restart"}>
                  <RotateCcw className={form.busy === "restart" ? "size-4 animate-spin" : "size-4"} />
                  重启 opencode
                </Button>
                <Button onClick={() => form.open()}>
                  <Plus className="size-4" />
                  新建 Agent
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StatCards
              items={[
                { label: "运行时总数", value: stat.run },
                { label: "全局自定义", value: stat.cfg },
                { label: "主智能体", value: stat.primary },
                { label: "子智能体", value: stat.sub },
              ]}
            />
          </CardContent>
        </Card>

        <InfoBanner>
          <div>
            全局 agent 文件路径：<code>{cfg.root || "~/.config/opencode/agents"}</code>
          </div>
          <div>
            每个自定义 agent 都会写入
            <code>{` <name>.md`}</code>。
          </div>
          <div>保存后不会自动刷新全局可用列表，请重启 opencode 服务重新加载。</div>
        </InfoBanner>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        <ResourceSection title="全局自定义 Agent" desc="这里仅管理写入全局配置目录的 Markdown agent 文件。">
          <ResourceState loading={load} empty={cfg.agents.length === 0} loading_text="正在加载全局 agent 文件..." empty_text="还没有自定义全局 agent。">
            <div className="space-y-3">
              {cfg.agents.map((item) => {
                const lock = form.busy === `drop:${item.name}`
                return (
                  <ResourceCard
                    key={item.path}
                    title={item.name}
                    badges={[item.mode, ...(item.hidden ? ["隐藏"] : [])]}
                    desc={item.description || "未提供描述"}
                    meta={[
                      ...(item.model ? [<>模型：{item.model}</>] : []),
                      <>{item.path}</>,
                      <>更新于： {stamp(item.updated_at)}</>,
                    ]}
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
          title="全局可用 Agent 列表"
          desc={
            <>
              这里直接展示 opencode <code>/agent</code> 返回的当前服务运行时结果，对所有工作区一致可用。
            </>
          }
        >
          <ResourceState loading={load} empty={run.length === 0} loading_text="正在加载全局可用 agent 列表..." empty_text="当前没有可用 agent。">
            <div className="space-y-3">
              {run.map((item) => (
                <ResourceCard
                  key={item.name}
                  title={item.name}
                  badges={[modeText(item.mode), tag(item), ...(item.hidden ? ["隐藏"] : [])]}
                  desc={item.description || "未提供描述"}
                  meta={[
                    ...(modelText(item.model) ? [<>模型： {modelText(item.model)}</>] : []),
                    ...(item.color ? [<>颜色： {item.color}</>] : []),
                    ...(item.steps ? [<>最大步数：{item.steps}</>] : []),
                  ]}
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
        title={form.dlg.mode === "create" ? "新建全局 Agent" : `编辑 ${cur?.name}`}
        name_title="Agent 名称"
        name={form.name}
        body_title="Agent Markdown"
        body={form.body}
        placeholder="例如：task-router"
        hint={`将写入 ~/.config/opencode/agents/${form.name || "<name>"}.md`}
        desc="这里直接编辑目标 Markdown agent 文件。保存后请重启 opencode 服务重新加载。"
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
