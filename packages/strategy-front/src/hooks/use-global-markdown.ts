import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { useGlobalData } from "@/data/global-data-provider"
import { note } from "@/lib/error"
import { digit, rule, wait } from "@/lib/global-markdown"

type Key = "agent" | "skill"

type Item = {
  name: string
  content: string
}

type Dlg<T> = {
  open: boolean
  mode: "create" | "edit"
  item?: T
}

type Text = {
  title: string
  label: string
  content: string
  create_ok: string
  update_ok: string
  save_err: string
  remove_ok: (name: string) => string
  remove_err: (name: string) => string
  restart_ok: string
  restart_err: string
}

type Input = {
  key: Key
  temp: (name: string) => string
  create: (body: { name: string; content: string }) => Promise<unknown>
  update: (name: string, body: { content: string }) => Promise<unknown>
  remove: (name: string) => Promise<unknown>
  reload: Array<"agent" | "provider" | "mcp" | "skill">
  text: Text
}

/**
 * 管理全局 Markdown 资源的编辑、删除和重启刷新逻辑。
 */
export function useGlobalMarkdown<T extends Item>(input: Input) {
  const { ensure, refresh, refreshMany } = useGlobalData()
  const [busy, setBusy] = useState("")
  const [dlg, setDlg] = useState<Dlg<T>>({
    open: false,
    mode: "create",
  })
  const [name, setName] = useState("")
  const [body, setBody] = useState(input.temp(""))

  useEffect(() => {
    void ensure(input.key)
  }, [ensure, input.key])

  /**
   * 轮询等待目标资源完成刷新。
   */
  const sync = useCallback(async () => {
    for (const _ of Array.from({ length: 8 })) {
      const next = await refresh(input.key)
      if (!next.err) {
        return true
      }
      await wait(500)
    }

    return false
  }, [input.key, refresh])

  /**
   * 打开新建或编辑对话框。
   */
  const open = useCallback(
    (item?: T) => {
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
      setBody(input.temp(""))
    },
    [input],
  )

  /**
   * 关闭对话框并清空本地草稿。
   */
  const close = useCallback(() => {
    setDlg({
      open: false,
      mode: "create",
    })
    setName("")
    setBody(input.temp(""))
  }, [input])

  /**
   * 更新名称，并在新建时同步刷新默认模板内容。
   */
  const rename = useCallback(
    (next: string) => {
      setName(next)
      if (dlg.mode !== "create") {
        return
      }

      if (body !== input.temp(name)) {
        return
      }

      setBody(input.temp(next))
    },
    [body, dlg.mode, input, name],
  )

  /**
   * 校验并保存当前编辑内容。
   */
  const save = useCallback(async () => {
    const id = name.trim().toLowerCase()
    if (!id) {
      toast.error(`请输入${input.text.label}名称`)
      return
    }

    if (!rule.test(id)) {
      toast.error(`${input.text.label}名称只能包含小写字母、数字、_ 和 -`)
      return
    }

    if (digit.test(id)) {
      toast.error(`${input.text.label}名称不能是纯数字`)
      return
    }

    if (!body.trim()) {
      toast.error(input.text.content)
      return
    }

    setBusy("save")
    try {
      if (dlg.mode === "create") {
        await input.create({
          name: id,
          content: body,
        })
        toast.success(input.text.create_ok)
      } else {
        await input.update(id, {
          content: body,
        })
        toast.success(input.text.update_ok)
      }
      close()
      await refresh(input.key)
    } catch (err) {
      toast.error(note(err, input.text.save_err))
    } finally {
      setBusy("")
    }
  }, [body, close, dlg.mode, input, name, refresh])

  /**
   * 删除指定资源。
   */
  const drop = useCallback(
    async (item: T) => {
      setBusy(`drop:${item.name}`)
      try {
        await input.remove(item.name)
        toast.success(input.text.remove_ok(item.name))
        await refresh(input.key)
      } catch (err) {
        toast.error(note(err, input.text.remove_err(item.name)))
      } finally {
        setBusy("")
      }
    },
    [input, refresh],
  )

  /**
   * 重启服务并刷新相关数据。
   */
  const restart = useCallback(async () => {
    setBusy("restart")
    try {
      await systemApi.opencodeRestart()
      await sync()
      await refreshMany(input.reload)
      toast.success(input.text.restart_ok)
    } catch (err) {
      toast.error(note(err, input.text.restart_err))
    } finally {
      setBusy("")
    }
  }, [input, refreshMany, sync])

  return {
    body,
    busy,
    close,
    dlg,
    drop,
    name,
    open,
    rename,
    restart,
    save,
    setBody,
  }
}
