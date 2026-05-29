import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ExternalLink, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { providerApi } from "@/api/modules/provider"
import type { Grant, Method, Provider } from "@/types/provider"
import { text } from "../../provider/utils"
import ui from "../../workstation/shared.module.css"
import css from "../settings.module.css"

function label(method: Method) {
  if (method.type === "api") return "API 密钥"
  if (method.label === "API Key") return "API 密钥"
  if (method.label === "OAuth") return "OAuth 授权"
  return method.label
}

export function ConnectDialog(props: {
  open: boolean
  item?: Provider
  list?: Method[]
  onOpenChange: (open: boolean) => void
  onDone: () => Promise<void>
}) {
  const open = props.open
  const done = props.onDone
  const change = props.onOpenChange
  const list = useMemo(() => (props.list?.length ? props.list : [{ type: "api" as const, label: "API 密钥" }]), [props.list])
  const [idx, setIdx] = useState<number>()
  const [grant, setGrant] = useState<Grant>()
  const [key, setKey] = useState("")
  const [code, setCode] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const item = props.item
  const method = idx === undefined ? undefined : list[idx]

  useEffect(() => {
    if (!open) return
    setIdx(undefined)
    setGrant(undefined)
    setKey("")
    setCode("")
    setErr("")
    setBusy(false)
  }, [open, item?.id])

  async function pick(next: number) {
    if (!item) return

    setIdx(next)
    setErr("")
    setGrant(undefined)
    setCode("")

    if (list[next]?.type !== "oauth") return

    setBusy(true)
    try {
      const res = await providerApi.authorize(item.id, next)
      setGrant(res)
      if (res.method === "code" && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      setErr(text(error, "无法发起 OAuth 授权"))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!open || !item || list.length !== 1) return

    setIdx(0)
    setErr("")
    setGrant(undefined)
    setCode("")

    if (list[0]?.type !== "oauth") return

    let live = true
    void (async () => {
      setBusy(true)
      try {
        const res = await providerApi.authorize(item.id, 0)
        if (!live) return
        setGrant(res)
        if (res.method === "code" && res.url) {
          window.open(res.url, "_blank", "noopener,noreferrer")
        }
      } catch (error) {
        if (live) setErr(text(error, "无法发起 OAuth 授权"))
      } finally {
        if (live) setBusy(false)
      }
    })()

    return () => {
      live = false
    }
  }, [open, item, list])

  useEffect(() => {
    if (!open || !item || idx === undefined || grant?.method !== "auto") return

    let live = true
    void (async () => {
      setBusy(true)
      setErr("")
      try {
        if (grant.url) {
          window.open(grant.url, "_blank", "noopener,noreferrer")
        }
        await providerApi.callback(item.id, { method: idx })
        await providerApi.dispose()
        await done()
        if (!live) return
        toast.success(`${item.name} 已连接`)
        change(false)
      } catch (error) {
        if (live) setErr(text(error, "OAuth 授权失败"))
      } finally {
        if (live) setBusy(false)
      }
    })()

    return () => {
      live = false
    }
  }, [change, done, grant, idx, item, open])

  async function saveKey(event: FormEvent) {
    event.preventDefault()
    if (!item) return
    if (!key.trim()) {
      setErr("请输入 API 密钥")
      return
    }

    setBusy(true)
    setErr("")
    try {
      await providerApi.set(item.id, { type: "api", key: key.trim() })
      await providerApi.dispose()
      await done()
      toast.success(`${item.name} 已连接`)
      change(false)
    } catch (error) {
      setErr(text(error, "保存 API 密钥失败"))
    } finally {
      setBusy(false)
    }
  }

  async function saveCode(event: FormEvent) {
    event.preventDefault()
    if (!item || idx === undefined) return
    if (!code.trim()) {
      setErr("请输入授权码")
      return
    }

    setBusy(true)
    setErr("")
    try {
      await providerApi.callback(item.id, { method: idx, code: code.trim() })
      await providerApi.dispose()
      await done()
      toast.success(`${item.name} 已连接`)
      change(false)
    } catch (error) {
      setErr(text(error, "授权码校验失败"))
    } finally {
      setBusy(false)
    }
  }

  if (!open || !item) return null

  return (
    <div className={css.overlay} onClick={() => !busy && change(false)}>
      <div className={css.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={css.modalhead}>
          <div>
            <h3>{`连接 ${item.name}`}</h3>
            <p>选择认证方式并完成授权。</p>
          </div>
          <button type="button" className={ui.icon} onClick={() => change(false)} disabled={busy}>
            <X size={14} />
          </button>
        </div>

        <div className={css.modalbody}>
          {!method ? (
            <div className={css.choices}>
              {list.map((item, at) => (
                <button key={`${item.type}-${item.label}`} type="button" className={css.choice} onClick={() => void pick(at)} disabled={busy}>
                  <strong>{label(item)}</strong>
                  <span>{item.type === "api" ? "通过 API 密钥连接" : "通过 OAuth 授权连接"}</span>
                </button>
              ))}
            </div>
          ) : null}

          {busy && !grant && method?.type === "oauth" ? (
            <div className={ui.load}>
              <Loader2 className={ui.spin} size={14} />
              正在发起授权...
            </div>
          ) : null}

          {method?.type === "api" ? (
            <form className={css.form} onSubmit={saveKey}>
              <label className={css.field}>
                <span>API 密钥</span>
                <input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="请输入密钥" autoFocus />
              </label>
              {err ? <p className={css.error}>{err}</p> : null}
              <Foot busy={busy} one={list.length === 1} onBack={() => setIdx(undefined)} />
            </form>
          ) : null}

          {method?.type === "oauth" && grant?.method === "code" ? (
            <form className={css.form} onSubmit={saveCode}>
              <div className={css.note}>
                <p>请在新窗口完成授权，然后把授权码粘贴回这里。</p>
                <a href={grant.url} target="_blank" rel="noreferrer">
                  打开授权链接
                  <ExternalLink size={14} />
                </a>
              </div>
              <label className={css.field}>
                <span>授权码</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入授权码" autoFocus />
              </label>
              {err ? <p className={css.error}>{err}</p> : null}
              <Foot busy={busy} one={list.length === 1} onBack={() => setIdx(undefined)} />
            </form>
          ) : null}

          {method?.type === "oauth" && grant?.method === "auto" ? (
            <div className={css.form}>
              <div className={css.note}>
                <p>请在新窗口完成授权。</p>
                {grant.instructions ? <code>{grant.instructions}</code> : null}
              </div>
              <div className={ui.load}>
                <Loader2 className={ui.spin} size={14} />
                等待服务端完成 OAuth 回调...
              </div>
              {err ? <p className={css.error}>{err}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Foot(props: { busy: boolean; one: boolean; onBack: () => void }) {
  return (
    <div className={css.modalfoot}>
      <button type="button" className={ui.btn} onClick={props.onBack} disabled={props.busy || props.one}>
        返回
      </button>
      <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={props.busy}>
        {props.busy ? "提交中..." : "提交"}
      </button>
    </div>
  )
}
