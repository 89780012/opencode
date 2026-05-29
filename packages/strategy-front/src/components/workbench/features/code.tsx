import { Copy } from "lucide-react"
import type { SessionItem } from "../data"
import css from "./code.module.css"
import ui from "../../workstation/shared.module.css"

export function CodePanel(props: { cur: SessionItem; onCopy: () => void }) {
  return (
    <section className={css.root}>
      <div className={css.head}>
        <div>
          <p className={css.eyebrow}>策略代码</p>
          <h2>strategy.py</h2>
        </div>
        <button type="button" onClick={props.onCopy}>
          <Copy size={14} />
          <span>复制</span>
        </button>
      </div>
      <pre className={ui.scroll}>{props.cur.codeContent}</pre>
    </section>
  )
}
