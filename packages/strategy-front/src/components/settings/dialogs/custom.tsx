import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { providerApi } from "@/api/modules/provider"
import type { Config } from "@/types/provider"
import { headerRow, modelRow, validate, type Form } from "../../provider/provider-custom-form"
import { text } from "../../provider/utils"
import { Field, Rows } from "../ui/form"
import css from "../settings.module.css"

function init(): Form {
  return {
    providerID: "",
    name: "",
    baseURL: "",
    apiKey: "",
    models: [modelRow()],
    headers: [headerRow()],
    err: {},
  }
}

export function CustomDialog(props: {
  open: boolean
  ids: Set<string>
  cfg: Config
  onOpenChange: (open: boolean) => void
  onDone: () => Promise<void>
}) {
  const [form, setForm] = useState<Form>(init)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const disabled = useMemo(() => props.cfg.disabled_providers ?? [], [props.cfg])

  function close(open: boolean) {
    props.onOpenChange(open)
    if (open) return
    setForm(init())
    setBusy(false)
    setLoading(false)
    setErr("")
  }

  function field(key: "providerID" | "name" | "baseURL" | "apiKey", value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      err: key === "apiKey" ? prev.err : { ...prev.err, [key]: undefined },
    }))
  }

  async function discover() {
    const baseURL = form.baseURL.trim()
    const msg = !baseURL
      ? "请输入服务地址后再获取模型"
      : !/^https?:\/\//.test(baseURL)
        ? "服务地址必须以 http:// 或 https:// 开头"
        : ""

    if (msg) {
      setForm((prev) => ({ ...prev, err: { ...prev.err, baseURL: msg } }))
      setErr("")
      return
    }

    setLoading(true)
    setErr("")

    try {
      const rows = await providerApi.discover({
        baseURL,
        apiKey: form.apiKey.trim() || undefined,
        headers: Object.fromEntries(
          form.headers
            .map((item) => [item.key.trim(), item.value.trim()] as const)
            .filter(([key, value]) => key && value),
        ),
      })

      if (rows.length === 0) {
        setErr("未获取到可用模型")
        return
      }

      setForm((prev) => ({
        ...prev,
        err: { ...prev.err, baseURL: undefined },
        models: rows.map((item) => ({
          row: modelRow().row,
          id: item.id,
          name: item.name,
          err: {},
        })),
      }))
    } catch (error) {
      setErr(text(error, "获取模型失败"))
    } finally {
      setLoading(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const out = validate({ form, ids: props.ids, disabled })

    setForm((prev) => ({
      ...prev,
      err: out.err,
      models: prev.models.map((item, idx) => ({ ...item, err: out.models[idx] ?? {} })),
      headers: prev.headers.map((item, idx) => ({ ...item, err: out.headers[idx] ?? {} })),
    }))

    if (!("result" in out) || !out.result) return

    setBusy(true)
    setErr("")

    try {
      if (out.result.key) {
        await providerApi.set(out.result.providerID, { type: "api", key: out.result.key })
      }

      await providerApi.update({
        provider: { [out.result.providerID]: out.result.cfg },
        disabled_providers: disabled.filter((item) => item !== out.result.providerID),
      })

      await props.onDone()
      toast.success(`${out.result.name} 已添加`)
      close(false)
    } catch (error) {
      setErr(text(error, "保存自定义 provider 失败"))
    } finally {
      setBusy(false)
    }
  }

  if (!props.open) return null

  return (
    <div className={css.overlay} onClick={() => !busy && !loading && close(false)}>
      <div className={`${css.modal} ${css.wide}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={css.modalhead}>
          <div>
            <h3>自定义 provider</h3>
            <p>配置一个兼容 OpenAI 的 provider，并通过服务地址获取模型列表。</p>
          </div>
          <button type="button" className={css.iconbtn} onClick={() => close(false)} disabled={busy || loading}>
            <X size={14} />
          </button>
        </div>

        <form className={css.form} onSubmit={save}>
          <div className={`${css.modalbody} ${css.scroll}`}>
            <div className={css.grid}>
              <Field
                label="Provider ID"
                value={form.providerID}
                err={form.err.providerID}
                onChange={(value) => field("providerID", value)}
                placeholder="请输入唯一标识"
              />
              <Field label="显示名称" value={form.name} err={form.err.name} onChange={(value) => field("name", value)} placeholder="请输入显示名称" />
              <Field
                label="服务地址"
                value={form.baseURL}
                err={form.err.baseURL}
                onChange={(value) => field("baseURL", value)}
                placeholder="https://api.example.com/v1"
              />
              <Field label="API Key" value={form.apiKey} onChange={(value) => field("apiKey", value)} placeholder="可填密钥，或使用 {env:MY_KEY}" />
            </div>

            <Rows
              title="模型"
              action={
                <button type="button" className={css.btn} disabled={busy || loading} onClick={() => void discover()}>
                  {loading ? <Loader2 className={css.spin} size={14} /> : <Plus size={14} />}
                  获取模型
                </button>
              }
            >
              {form.models.map((item, idx) => (
                <div key={item.row} className={css.fieldrow}>
                  <Field
                    value={item.id}
                    err={item.err.id}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        models: prev.models.map((row, at) => (at === idx ? { ...row, id: value, err: { ...row.err, id: undefined } } : row)),
                      }))
                    }
                    placeholder="模型标识"
                  />
                  <Field
                    value={item.name}
                    err={item.err.name}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        models: prev.models.map((row, at) => (at === idx ? { ...row, name: value, err: { ...row.err, name: undefined } } : row)),
                      }))
                    }
                    placeholder="显示名称"
                  />
                  <Icon disabled={form.models.length === 1} label="删除模型" onClick={() => setForm((prev) => ({ ...prev, models: prev.models.filter((_, at) => at !== idx) }))} />
                </div>
              ))}
            </Rows>

            <Rows
              title="请求头"
              action={
                <button type="button" className={css.btn} onClick={() => setForm((prev) => ({ ...prev, headers: [...prev.headers, headerRow()] }))}>
                  <Plus size={14} />
                  添加请求头
                </button>
              }
            >
              {form.headers.map((item, idx) => (
                <div key={item.row} className={css.fieldrow}>
                  <Field
                    value={item.key}
                    err={item.err.key}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        headers: prev.headers.map((row, at) => (at === idx ? { ...row, key: value, err: { ...row.err, key: undefined } } : row)),
                      }))
                    }
                    placeholder="Header 名称"
                  />
                  <Field
                    value={item.value}
                    err={item.err.value}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        headers: prev.headers.map((row, at) => (at === idx ? { ...row, value, err: { ...row.err, value: undefined } } : row)),
                      }))
                    }
                    placeholder="Header 值"
                  />
                  <Icon disabled={form.headers.length === 1} label="删除请求头" onClick={() => setForm((prev) => ({ ...prev, headers: prev.headers.filter((_, at) => at !== idx) }))} />
                </div>
              ))}
            </Rows>

            {err ? <p className={css.error}>{err}</p> : null}
          </div>

          <div className={css.modalfoot}>
            <button type="button" className={css.btn} onClick={() => close(false)} disabled={busy || loading}>
              取消
            </button>
            <button type="submit" className={`${css.btn} ${css.primary}`} disabled={busy || loading}>
              {busy ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Icon(props: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={css.iconbtn} disabled={props.disabled} onClick={props.onClick} aria-label={props.label}>
      <Trash2 size={14} />
    </button>
  )
}
