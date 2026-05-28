import type { KeyboardEventHandler, PointerEventHandler } from "react"
import css from "./handle.module.css"

export function Handle(props: {
  edge?: "right"
  onDown: PointerEventHandler<HTMLDivElement>
  onKey: KeyboardEventHandler<HTMLDivElement>
  active: boolean
  min: number
  max: number
  now: number
  label: string
}) {
  return (
    <div
      className={`${css.handle} ${props.edge === "right" ? css.right : ""} ${props.active ? css.on : ""}`}
      onPointerDown={props.onDown}
      onKeyDown={props.onKey}
      role="separator"
      aria-orientation="vertical"
      aria-label={props.label}
      aria-valuemin={props.min}
      aria-valuemax={props.max}
      aria-valuenow={props.now}
      tabIndex={0}
    ></div>
  )
}
