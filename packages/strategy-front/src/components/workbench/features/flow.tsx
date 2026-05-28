import { Play, Workflow } from "lucide-react"
import { useEffect, useRef } from "react"
import type { SessionItem } from "../data"
import ui from "../shared.module.css"
import css from "./stage.module.css"

let boot = false

export function Flow(props: { cur: SessionItem; id: string; onRun: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!props.cur.flowchartCode) {
      node.innerHTML = ""
      return
    }

    let on = true
    node.innerHTML = ""
    import("mermaid")
      .then((mod) => {
        const chart = mod.default
        if (!boot) {
          chart.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "default",
          })
          boot = true
        }
        return chart.render(`workbench-${props.id}`, props.cur.flowchartCode)
      })
      .then((res) => {
        if (!on || !res || !ref.current) return
        ref.current.innerHTML = res.svg
        res.bindFunctions?.(ref.current)
      })
      .catch(() => {
        if (!on || !ref.current) return
        ref.current.textContent = props.cur.flowchartCode
      })

    return () => {
      on = false
    }
  }, [props.cur.flowchartCode, props.id])

  return (
    <section className={css.root}>
      <div className={css.head}>
        <strong className={ui.sectiontitle}>
          <Workflow size={16} />
          <span>流程图</span>
        </strong>
        <button type="button" className={ui.blockbtn} onClick={props.onRun}>
          <Play size={14} />
          <span>运行回测</span>
        </button>
      </div>
      {props.cur.flowchartCode ? (
        <div className={css.flowbox}>
          <div ref={ref} className={css.flow}></div>
        </div>
      ) : (
        <div className={ui.empty}>暂无流程图</div>
      )}
    </section>
  )
}
