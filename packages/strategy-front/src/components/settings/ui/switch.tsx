import css from "../styles/settings.module.css"

export function Switch(props: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={css.switchline}>
      <span>{props.label}</span>
      <span className={css.switch}>
        <input
          type="checkbox"
          checked={props.checked}
          disabled={props.disabled}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span className={css.track} />
      </span>
    </label>
  )
}
