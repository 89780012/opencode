import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { mcpApi } from "@/api/modules"
import { useGlobalData } from "@/data/global-data-provider"
import type { McpCfg, McpDoc, McpRow, McpStatus } from "@/types/mcp"
import { enabled, isCfg, kind, oauth, sort, summary, text, view } from "@/components/mcp/utils"

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

/**
 * 生成状态提示文案，用于授权和失败提示。
 */
export function info(status?: McpStatus) {
  if (!status) return ""
  if ("error" in status && status.error) return status.error
  if (status.status === "needs_auth") {
    return "远程服务需要先完成 OAuth 授权，完成后再连接。"
  }
  return ""
}

/**
 * 管理 MCP 页面内的数据分组、弹窗和动作逻辑。
 */
export function useMcpPage() {
  const { mcp, ensure, refresh } = useGlobalData()
  const [busy, setBusy] = useState("")
  const [dlg, setDlg] = useState<Dlg>({
    open: false,
    mode: "create",
  })
  const [auth, setAuth] = useState<Auth>()
  const doc = mcp.data.doc
  const map = mcp.data.map
  const load = mcp.load
  const err = mcp.err

  /**
   * 合并配置和运行时状态，得到页面使用的行数据。
   */
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

  /**
   * 已存在的 MCP 名称集合，用于弹窗校验。
   */
  const names = useMemo(() => new Set(rows.map((item) => item.name)), [rows])

  /**
   * 当前对话框正在编辑的行。
   */
  const item = useMemo(() => rows.find((entry) => entry.name === dlg.name), [dlg.name, rows])

  /**
   * 统计不同状态下的条目数量。
   */
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

  useEffect(() => {
    void ensure("mcp")
  }, [ensure])

  /**
   * 合并更新全局 MCP 配置。
   */
  async function patch(body: McpDoc) {
    await mcpApi.update(body)
  }

  /**
   * 保存一个 MCP 配置，并根据启用状态自动连接或断开。
   */
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
      await refresh("mcp")
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

  /**
   * 连接指定 MCP 服务。
   */
  async function connect(name: string) {
    setBusy(`connect:${name}`)
    try {
      await mcpApi.connect(name)
      await refresh("mcp")
      toast.success(`已连接 ${name}`)
    } catch (err) {
      toast.error(text(err, `连接 ${name} 失败`))
    } finally {
      setBusy("")
    }
  }

  /**
   * 断开指定 MCP 服务。
   */
  async function disconnect(name: string) {
    setBusy(`disconnect:${name}`)
    try {
      await mcpApi.disconnect(name)
      await refresh("mcp")
      toast.success(`已断开 ${name}`)
    } catch (err) {
      toast.error(text(err, `断开 ${name} 失败`))
    } finally {
      setBusy("")
    }
  }

  /**
   * 切换一个 MCP 条目的启用状态。
   */
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
      await refresh("mcp")
      toast.success(item.enabled ? `已禁用 ${item.name}` : `已启用 ${item.name}`)
    } catch (err) {
      toast.error(text(err, `更新 ${item.name} 失败`))
    } finally {
      setBusy("")
    }
  }

  /**
   * 尝试自动完成 OAuth 授权。
   */
  async function authRun(name: string) {
    setBusy(`auth:${name}`)
    try {
      const status = await mcpApi.authenticate(name)
      await refresh("mcp")
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

  /**
   * 启动手动 OAuth 授权流程，并记录授权链接。
   */
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

  /**
   * 提交手动授权码，并刷新服务状态。
   */
  async function authDone() {
    if (!auth?.code.trim()) return

    setBusy(`code:${auth.name}`)
    try {
      const status = await mcpApi.authCallback(auth.name, auth.code.trim())
      await refresh("mcp")
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

  /**
   * 清除指定服务的授权信息。
   */
  async function authDrop(name: string) {
    setBusy(`drop:${name}`)
    try {
      await mcpApi.authRemove(name)
      await refresh("mcp")
      toast.success(`已清除 ${name} 的授权信息`)
    } catch (err) {
      toast.error(text(err, `清除 ${name} 的授权信息失败`))
    } finally {
      setBusy("")
    }
  }

  /**
   * 根据连接状态将条目分组，便于页面分区展示。
   */
  const groups = useMemo(
    () => ({
      ok: rows.filter((item) => view(item) === "connected"),
      disc: rows.filter((item) => view(item) === "disconnected"),
      auth: rows.filter((item) => view(item) === "auth"),
      bad: rows.filter((item) => view(item) === "issue"),
      off: rows.filter((item) => view(item) === "disabled"),
    }),
    [rows],
  )

  return {
    auth,
    authDone,
    authDrop,
    authRun,
    authStart,
    busy,
    connect,
    disconnect,
    dlg,
    err,
    flip,
    groups,
    item,
    load,
    names,
    openCreate() {
      setDlg({
        open: true,
        mode: "create",
      })
    },
    openEdit(name: string) {
      setDlg({
        open: true,
        mode: "edit",
        name,
      })
    },
    refresh: () => refresh("mcp"),
    save,
    setAuth,
    setAuthCode(code: string) {
      setAuth((prev) => (prev ? { ...prev, code } : prev))
    },
    setDlg,
    stats,
  }
}
