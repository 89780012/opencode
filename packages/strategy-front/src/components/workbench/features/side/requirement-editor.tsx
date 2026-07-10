import { FileText, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { workbenchApi } from "@/api/modules"
import { useAppDispatch } from "@/store"
import { setRequirements } from "@/store/workbench-slice"
import { Compact } from "../../layout/compact"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/side/side.module.css"

type Row = {
  id: number
  text: string
}

let seq = 0

function rows(items: string[]) {
  return items.map((text) => ({ id: ++seq, text }))
}

function same(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, idx) => item === b[idx])
}

function fit(node: HTMLTextAreaElement | null) {
  if (!node) return
  node.style.height = "auto"
  node.style.height = `${node.scrollHeight + 2}px`
}

export function RequirementEditor(props: {
  path: string
  id: string
  items: string[]
  open: boolean
  onToggle: () => void
}) {
  const dispatch = useAppDispatch()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<Row[]>(() => rows(props.items))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const key = `${props.path}\u0000${props.id}`
  const active = useRef(key)
  const request = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  active.current = key
  const source = useRef(props.items)
  source.current = props.items
  const items = useMemo(() => draft.map((item) => item.text.trim()), [draft])
  const invalid = draft.some((item) => !item.text.trim())
  const dirty = !same(items, props.items)

  useEffect(() => {
    const gen = ++request.current
    setEdit(false)
    setDraft(rows(source.current))
    setSaving(false)
    setErr("")
    return () => {
      request.current = gen + 1
      if (active.current === key) active.current = ""
    }
  }, [key])

  useEffect(() => {
    if (edit) return
    setDraft(rows(props.items))
  }, [edit, props.items])

  const start = () => {
    if (!props.open) props.onToggle()
    setDraft(rows(props.items))
    setErr("")
    setEdit(true)
  }

  const cancel = () => {
    setDraft(rows(props.items))
    setErr("")
    setEdit(false)
  }

  const add = () => {
    if (saving) return
    if (!props.open) props.onToggle()
    setDraft((list) => [...(edit ? list : rows(props.items)), { id: ++seq, text: "" }])
    setErr("")
    setEdit(true)
    requestAnimationFrame(() => {
      const inputs = box.current?.querySelectorAll("textarea")
      if (!inputs?.length) return
      const input = inputs[inputs.length - 1]
      input.focus()
      input.scrollIntoView({ block: "nearest" })
    })
  }

  const change = (id: number, text: string) => {
    setDraft((list) => list.map((item) => (item.id === id ? { ...item, text } : item)))
    setErr("")
  }

  const drop = (id: number) => {
    setDraft((list) => list.filter((item) => item.id !== id))
    setErr("")
  }

  const save = async () => {
    if (!props.path || !props.id || invalid || !dirty || saving) return
    const token = key
    const gen = ++request.current
    setSaving(true)
    setErr("")
    try {
      const data = await workbenchApi.saveRequirements(
        {
          workspacePath: props.path,
          sessionId: props.id,
          requirements: items,
        },
      )
      dispatch(setRequirements(data))
      if (active.current !== token || request.current !== gen) return
      setDraft(rows(data.requirements))
      setEdit(false)
      toast.success("需求已保存")
    } catch (error) {
      if (active.current !== token || request.current !== gen) return
      const message = error instanceof Error ? error.message : "保存需求失败"
      setErr(message)
      toast.error(message)
    } finally {
      if (active.current === token && request.current === gen) {
        setSaving(false)
      }
    }
  }

  const status = invalid ? "需求内容不能为空，请填写或删除该条目。" : err || (dirty ? "未保存" : "")

  return (
    <Compact
      open={props.open}
      icon={FileText}
      title="需求理解"
      onToggle={props.onToggle}
      action={
        props.id ? (
          <span className={css.reqtools}>
            <button
              type="button"
              className={`${css.headbtn} ${css.reqhead}`}
              disabled={saving}
              onClick={add}
              aria-label="新增需求"
              title="新增需求"
            >
              <Plus size={13} />
            </button>
            {!edit ? (
              <button
                type="button"
                className={`${css.headbtn} ${css.reqhead}`}
                onClick={start}
                aria-label="编辑需求"
                title="编辑需求"
              >
                <Pencil size={13} />
              </button>
            ) : null}
          </span>
        ) : undefined
      }
    >
      {edit ? (
        <div className={css.reqeditor}>
          <div ref={box} className={css.reqbox}>
            {draft.length ? (
              draft.map((item, idx) => (
                <div key={item.id} className={css.reqeditrow}>
                  <span className={css.reqnum}>{idx + 1}.</span>
                  <textarea
                    ref={fit}
                    className={css.reqinput}
                    value={item.text}
                    rows={1}
                    disabled={saving}
                    spellCheck={false}
                    aria-label={`需求 ${idx + 1}`}
                    onChange={(event) => {
                      fit(event.currentTarget)
                      change(item.id, event.currentTarget.value)
                    }}
                  />
                  <button
                    type="button"
                    className={css.reqdelete}
                    disabled={saving}
                    aria-label={`删除需求 ${idx + 1}`}
                    title="删除需求"
                    onClick={() => drop(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className={ui.empty}>需求清单为空</div>
            )}
          </div>

          <div className={css.reqfooter}>
            <span className={`${css.reqstatus} ${invalid || err ? css.reqerror : ""}`}>{status}</span>
            <div className={css.reqactions}>
              <button type="button" className={css.cancel} disabled={saving} onClick={cancel}>
                <X size={13} />
                <span>取消</span>
              </button>
              <button type="button" className={css.confirm} disabled={invalid || !dirty || saving} onClick={() => void save()}>
                {saving ? <LoaderCircle size={13} className={ui.spin} /> : <Save size={13} />}
                <span>{saving ? "保存中" : dirty ? "保存" : "已保存"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={css.reqbox}>
          {props.items.length ? (
            props.items.map((item, idx) => (
              <div key={`${idx}-${item}`} className={css.reqrow}>
                <span>{idx + 1}.</span>
                <p>{item}</p>
              </div>
            ))
          ) : (
            <div className={ui.empty}>暂无需求理解</div>
          )}
        </div>
      )}
    </Compact>
  )
}
