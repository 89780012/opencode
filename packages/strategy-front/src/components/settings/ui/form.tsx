import type { ReactNode } from "react"
import css from "../styles/settings.module.css"

export function Field(props: { label?: string; value: string; err?: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className={css.field}>
      {props.label ? <span>{props.label}</span> : null}
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder={props.placeholder} />
      {props.err ? <em>{props.err}</em> : null}
    </label>
  )
}

export function Rows(props: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className={css.formblock}>
      <div className={css.formhead}>
        <h4>{props.title}</h4>
        {props.action}
      </div>
      <div className={css.rows}>{props.children}</div>
    </section>
  )
}
