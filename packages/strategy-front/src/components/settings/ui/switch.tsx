import css from "../settings.module.css"

export function Switch(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={css.switchline}>
      <span>{props.label}</span>
      <span className={css.switch}>
        <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
        <span className={css.track} />
      </span>
    </label>
  )
}
