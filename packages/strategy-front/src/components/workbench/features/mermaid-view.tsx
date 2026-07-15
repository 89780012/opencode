import { CircleAlert, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { flowText, mermaidError, mermaidText, renderMermaid } from "@/lib/mermaid"

export function MermaidView(props: {
  value: string
  flow?: boolean
  className?: string
  errorClassName?: string
  sourceClassName?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [err, setErr] = useState("")
  const [retry, setRetry] = useState(0)
  const code = useMemo(() => (props.flow ? flowText(props.value) : mermaidText(props.value)), [props.flow, props.value])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!code) {
      node.innerHTML = ""
      setErr("")
      return
    }
    let on = true
    node.innerHTML = ""
    setErr("")
    renderMermaid(code).then(
      (res) => {
        if (!on || !ref.current) return
        ref.current.innerHTML = res.svg
        res.bindFunctions?.(ref.current)
      },
      (error) => {
        if (!on) return
        node.innerHTML = ""
        const msg = mermaidError(error)
        setErr(msg)
        if (import.meta.env.DEV) console.error("Mermaid render failed", error)
      },
    )
    return () => {
      on = false
    }
  }, [code, retry])

  return (
    <>
      <div ref={ref} className={props.className} style={props.style} />
      {err ? (
        <div className={props.errorClassName}>
          <div>
            <CircleAlert size={16} />
            <strong>流程图渲染失败</strong>
          </div>
          <p>{err}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            <RefreshCw size={13} />
            <span>重试</span>
          </button>
          {props.sourceClassName ? <pre className={props.sourceClassName}>{code}</pre> : null}
        </div>
      ) : null}
    </>
  )
}
