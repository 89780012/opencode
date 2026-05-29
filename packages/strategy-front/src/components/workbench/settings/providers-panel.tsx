import { Loader2, Plus, RefreshCcw } from "lucide-react"
import type { Provider } from "@/types/provider"
import { note, source } from "../../provider/utils"
import ui from "../shared.module.css"
import css from "./settings.module.css"
import type { useSettings } from "./use-settings"

type App = ReturnType<typeof useSettings>

function List(props: {
  app: App
  items: Provider[]
  mode: "connected" | "available"
  empty: string
}) {
  if (props.app.page.load) {
    return (
      <div className={css.load}>
        <Loader2 className={ui.spin} size={14} />
        正在加载提供商状态...
      </div>
    )
  }

  if (props.items.length === 0) {
    return <div className={css.empty}>{props.empty}</div>
  }

  return (
    <div className={css.rows}>
      {props.items.map((item) => {
        const models = Object.keys(item.models ?? {}).length
        const msg = note(item.id)
        const busy = props.app.page.busy === item.id

        return (
          <article key={item.id} className={css.row}>
            <div className={css.info}>
              <div className={css.line}>
                <strong>{item.name}</strong>
                <span>{item.id}</span>
                {props.app.linked.has(item.id) ? <span>{source(item)}</span> : null}
              </div>
              {msg ? <p>{msg}</p> : null}
              <div className={css.meta}>
                <span>{models} 个模型</span>
                {item.env.length > 0 ? <span>{item.env.length} 个环境变量</span> : null}
                {item.api ? <span>{item.api}</span> : null}
              </div>
            </div>
            <div className={css.actions}>
              {props.mode === "available" ? (
                <button type="button" className={`${css.btn} ${css.primary}`} onClick={() => props.app.page.setItem(item)}>
                  连接
                </button>
              ) : item.source === "env" ? (
                <span className={css.status}>来自环境变量</span>
              ) : (
                <button type="button" className={css.btn} onClick={() => void props.app.page.remove(item)} disabled={busy}>
                  {busy ? <Loader2 className={ui.spin} size={14} /> : null}
                  {busy ? "处理中..." : "断开"}
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function ProvidersPanel(props: { app: App }) {
  const app = props.app

  return (
    <div className={css.panel}>
      <header className={css.head}>
        <div>
          <h2>提供商</h2>
          <p>连接、断开和添加当前工作台可用的模型 provider。</p>
        </div>
        <div className={css.actions}>
          <button type="button" className={css.btn} onClick={() => void app.page.refresh()} disabled={app.page.load}>
            <RefreshCcw className={app.page.load ? ui.spin : ""} size={14} />
            刷新
          </button>
          <button type="button" className={`${css.btn} ${css.primary}`} onClick={() => app.page.setCustomOpen(true)}>
            <Plus size={14} />
            自定义
          </button>
        </div>
      </header>

      <div className={css.metrics}>
        <div>
          <span>已连接</span>
          <strong>{app.stats.providers}</strong>
        </div>
        <div>
          <span>可连接</span>
          <strong>{app.stats.available}</strong>
        </div>
        <div>
          <span>热门</span>
          <strong>{app.stats.hot}</strong>
        </div>
      </div>

      {app.page.err ? <div className={css.alert}>{app.page.err}</div> : null}

      <section className={css.section}>
        <div className={css.title}>
          <h3>已连接</h3>
          <p>这些 provider 已经暴露给当前工作台。</p>
        </div>
        <List app={app} items={app.page.connected} mode="connected" empty="暂时还没有已连接的提供商。" />
      </section>

      <section className={css.section}>
        <div className={css.title}>
          <h3>热门</h3>
          <p>常用入口放在前面，方便快速接入。</p>
        </div>
        <List app={app} items={app.page.popularList} mode="available" empty="没有更多热门提供商可连接。" />
      </section>

      <section className={css.section}>
        <div className={css.title}>
          <h3>更多</h3>
          <p>后端已经识别到但尚未连接的其他 provider。</p>
        </div>
        <List app={app} items={app.page.other} mode="available" empty="没有更多可用 provider。" />
      </section>
    </div>
  )
}
