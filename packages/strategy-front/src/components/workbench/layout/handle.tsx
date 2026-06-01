import type { KeyboardEventHandler, PointerEventHandler } from "react"
import css from "../styles/layout/handle.module.css"

export function Handle(props: {
  edge?: "right"
  onDown: PointerEventHandler<HTMLDivElement>
  onKey: KeyboardEventHandler<HTMLDivElement>
  active: boolean
  min: number
  max: number
  width: number
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
      aria-valuenow={props.width}
      tabIndex={0}
    ></div>
  )
}
