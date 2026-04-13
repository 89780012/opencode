"use client"

import { useMemo } from "react"
import { CheckCircle2, KeyRound, Pencil, PlugZap, RefreshCcw, ServerCog, ShieldOff, Unplug, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InfoBanner,
  ResourceCard,
  ResourceSection,
  ResourceState,
  StatCards,
} from "@/components/shared/global-resource-section"
import { useMcpPage, info } from "@/hooks/use-mcp-page"
import type { McpRow } from "@/types/mcp"
import { McpAuthDialog } from "./mcp-auth-dialog"
import { McpDialog } from "./mcp-dialog"
import { isCfg, tone, view } from "./utils"

/**
 * 将 MCP 类型转换成更适合页面展示的中文文案。
 */
function kindText(kind: McpRow["kind"]) {
  if (kind === "local") {
    return "本地"
  }

  if (kind === "remote") {
    return "远程"
  }

  return "未知"
}

/**
 * 渲染单个 MCP 条目卡片，只保留展示和按钮分发逻辑。
 */
function McpRowCard(props: {
  item: McpRow
  busy: string
  onAuthDrop: (name: string) => void
  onAuthRun: (name: string) => void
  onAuthStart: (name: string) => void
  onConnect: (name: string) => void
  onDisconnect: (name: string) => void
  onEdit: (name: string) => void
  onFlip: (item: McpRow) => void
}) {
  const meta = tone(props.item)
  const state = view(props.item)
  const lock = props.busy.endsWith(`:${props.item.name}`)
  const msg = info(props.item.status)

  return (
    <ResourceCard
      title={props.item.name}
      badges={[kindText(props.item.kind), meta.text]}
      desc={
        <div className="space-y-3">
          <div className="break-all">{props.item.summary}</div>
          {msg ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>
          ) : null}
        </div>
      }
      actions={
        <>
          {state === "connected" ? (
            <Button variant="outline" onClick={() => props.onDisconnect(props.item.name)} disabled={lock}>
              <Unplug className="size-4" />
              断开连接
            </Button>
          ) : (
            <Button
              onClick={() => props.onConnect(props.item.name)}
              disabled={lock || !isCfg(props.item.cfg) || !props.item.enabled}
            >
              <PlugZap className="size-4" />
              {state === "disconnected" ? "重新连接" : "连接"}
            </Button>
          )}

          {props.item.oauth ? (
            <Button variant="outline" onClick={() => props.onAuthRun(props.item.name)} disabled={lock}>
              <CheckCircle2 className="size-4" />
              自动授权
            </Button>
          ) : null}

          {props.item.oauth ? (
            <Button variant="outline" onClick={() => props.onAuthStart(props.item.name)} disabled={lock}>
              <KeyRound className="size-4" />
              手动授权
            </Button>
          ) : null}

          {props.item.oauth ? (
            <Button variant="outline" onClick={() => props.onAuthDrop(props.item.name)} disabled={lock}>
              <ShieldOff className="size-4" />
              清除授权
            </Button>
          ) : null}

          {isCfg(props.item.cfg) ? (
            <Button variant="outline" onClick={() => props.onEdit(props.item.name)} disabled={lock}>
              <Pencil className="size-4" />
              编辑
            </Button>
          ) : null}

          {isCfg(props.item.cfg) ? (
            <Button variant="outline" onClick={() => props.onFlip(props.item)} disabled={lock}>
              <Wrench className="size-4" />
              {props.item.enabled ? "禁用" : "启用"}
            </Button>
          ) : null}
        </>
      }
    />
  )
}

/**
 * 渲染某个分组下的 MCP 列表。
 */
function McpList(props: {
  items: McpRow[]
  busy: string
  onAuthDrop: (name: string) => void
  onAuthRun: (name: string) => void
  onAuthStart: (name: string) => void
  onConnect: (name: string) => void
  onDisconnect: (name: string) => void
  onEdit: (name: string) => void
  onFlip: (item: McpRow) => void
}) {
  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <McpRowCard
          key={item.name}
          item={item}
          busy={props.busy}
          onAuthDrop={props.onAuthDrop}
          onAuthRun={props.onAuthRun}
          onAuthStart={props.onAuthStart}
          onConnect={props.onConnect}
          onDisconnect={props.onDisconnect}
          onEdit={props.onEdit}
          onFlip={props.onFlip}
        />
      ))}
    </div>
  )
}

/**
 * 组合 MCP 页面结构，页面本身只负责分区展示和弹窗接线。
 */
export function McpPage() {
  const page = useMcpPage()
  const sections = useMemo(
    () => [
      {
        key: "ok",
        title: "已连接",
        desc: "当前已连接且可用的服务。",
        items: page.groups.ok,
      },
      {
        key: "disc",
        title: "已断开",
        desc: "配置仍处于启用状态，但当前连接已关闭，可直接重新连接。",
        items: page.groups.disc,
      },
      {
        key: "auth",
        title: "待授权",
        desc: "等待完成 OAuth 授权的远程服务。",
        items: page.groups.auth,
      },
      {
        key: "bad",
        title: "需处理",
        desc: "连接失败或缺少客户端注册信息的服务。",
        items: page.groups.bad,
      },
      {
        key: "off",
        title: "已禁用",
        desc: "仍保留在配置中，但不会参与自动连接的条目。",
        items: page.groups.off,
      },
    ],
    [page.groups],
  )

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
                <Button variant="outline" onClick={() => void page.refresh()} disabled={page.load}>
                  <RefreshCcw className={page.load ? "size-4 animate-spin" : "size-4"} />
                  刷新
                </Button>
                <Button onClick={page.openCreate}>
                  <ServerCog className="size-4" />
                  新增 MCP
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StatCards
              items={[
                { label: "总数", value: page.stats.all },
                { label: "已连接", value: page.stats.ok },
                { label: "已断开", value: page.stats.disc },
                { label: "待授权", value: page.stats.auth },
                { label: "需处理", value: page.stats.bad },
                { label: "已禁用", value: page.stats.off },
              ]}
            />
          </CardContent>
        </Card>

        <InfoBanner>
          <div>配置更新采用合并模式。</div>
          <div>当前页面支持新增、编辑、启用和禁用，但不支持直接删除某个 MCP 键。</div>
          <div>
            如需彻底删除，请到 <code>~/.config/opencode/opencode.jsonc</code> 中手动移除对应配置。
          </div>
        </InfoBanner>

        {page.err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{page.err}</div>
        ) : null}

        {sections.map((section) => (
          <ResourceSection key={section.key} title={section.title} desc={section.desc}>
            <ResourceState
              loading={page.load}
              empty={section.items.length === 0}
              loading_text="加载中..."
              empty_text="暂无数据。"
            >
              <McpList
                items={section.items}
                busy={page.busy}
                onAuthDrop={(name) => void page.authDrop(name)}
                onAuthRun={(name) => void page.authRun(name)}
                onAuthStart={(name) => void page.authStart(name)}
                onConnect={(name) => void page.connect(name)}
                onDisconnect={(name) => void page.disconnect(name)}
                onEdit={page.openEdit}
                onFlip={(item) => void page.flip(item)}
              />
            </ResourceState>
          </ResourceSection>
        ))}
      </div>

      <McpDialog
        key={`${page.dlg.mode}:${page.dlg.name ?? "new"}:${page.dlg.open ? "1" : "0"}`}
        open={page.dlg.open}
        mode={page.dlg.mode}
        busy={page.busy.startsWith("save:")}
        item={page.item}
        names={page.names}
        onOpenChange={(open) =>
          page.setDlg((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { name: undefined }),
          }))
        }
        onSave={page.save}
      />

      <McpAuthDialog
        open={!!page.auth}
        auth={page.auth}
        busy={page.busy.startsWith("code:")}
        onCode={page.setAuthCode}
        onClose={() => page.setAuth(undefined)}
        onSubmit={() => {
          void page.authDone()
        }}
      />
    </div>
  )
}
