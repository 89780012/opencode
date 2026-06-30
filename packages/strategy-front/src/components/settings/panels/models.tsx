import { ArrowDown, ArrowUp, ArrowUpToLine, ChevronDown, Loader2, RefreshCcw, RotateCcw, Search } from "lucide-react"
import { useState } from "react"
import { modelChainLimit, modelKey } from "@/lib/model-catalog"
import { Switch } from "../ui/switch"
import ui from "../../shared/styles/ui.module.css"
import css from "../styles/settings.module.css"
import type { useSettings } from "../hooks/use-settings"

type App = ReturnType<typeof useSettings>

export function ModelsPanel(props: { app: App; onProviders: () => void }) {
  const app = props.app
  const pick = app.order[0] ? `${app.order[0].providerID}/${app.order[0].modelID}` : ""
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const query = app.q.trim().length > 0

  return (
    <div className={css.panel}>
      <header className={css.head}>
        <div>
          <h2>模型</h2>
          <p>控制模型显示范围和链式模型优先级。</p>
        </div>
        <div className={css.actions}>
          <button type="button" className={ui.btn} onClick={() => void app.prv.reload()} disabled={app.prv.load}>
            <RefreshCcw className={app.prv.load ? ui.spin : ""} size={14} />
            刷新
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={app.clear}
            disabled={app.prv.load || Object.keys(app.user).length === 0}
          >
            <RotateCcw size={14} />
            重置显示
          </button>
        </div>
      </header>

      <section className={css.section}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>链式优先级</h3>
            <p>最多保留前 {modelChainLimit} 个已显示模型。</p>
          </div>
          <div className={css.actions}>
            <span className={css.status}>
              {app.order.length}/{modelChainLimit}
            </span>
            <button type="button" className={ui.btn} onClick={app.reset} disabled={app.shown.length === 0}>
              <RotateCcw size={14} />
              自动排序
            </button>
          </div>
        </div>

        {app.order.length === 0 ? (
          <div className={css.empty}>暂无可参与排序的模型。先连接 provider 并打开模型显示。</div>
        ) : (
          <div className={css.rows}>
            {app.order.map((item, idx) => {
              const row = app.map.get(modelKey(item))
              if (!row) return null
              const cur = `${item.providerID}/${item.modelID}` === pick

              return (
                <article key={modelKey(item)} className={css.row}>
                  <div className={css.info}>
                    <div className={css.line}>
                      <strong>#{idx + 1}</strong>
                      <strong>{row.name}</strong>
                      <span>{row.id}</span>
                      <span>{row.provider.name}</span>
                      {cur ? <span>当前</span> : null}
                    </div>
                    <div className={css.meta}>
                      <span>上下文 {row.limit.context.toLocaleString()}</span>
                      <span>{row.capabilities?.toolcall ? "支持工具" : "不支持工具"}</span>
                    </div>
                  </div>
                  <div className={css.actions}>
                    <button
                      type="button"
                      className={css.icon}
                      onClick={() => app.top(idx)}
                      disabled={idx === 0}
                      aria-label="置顶"
                    >
                      <ArrowUpToLine size={14} />
                    </button>
                    <button
                      type="button"
                      className={css.icon}
                      onClick={() => app.move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="上移"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={css.icon}
                      onClick={() => app.move(idx, 1)}
                      disabled={idx === app.order.length - 1}
                      aria-label="下移"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className={`${css.section} ${css.fill}`}>
        <div className={css.titleline}>
          <div className={css.title}>
            <h3>模型目录</h3>
            <p>
              {app.stats.providers} 个 provider，{app.stats.models} 个模型，当前显示 {app.stats.shown} 个。
            </p>
          </div>
          <label className={css.search}>
            <Search size={14} />
            <input
              value={app.q}
              onChange={(event) => app.setQ(event.target.value)}
              placeholder="搜索 provider 或模型"
            />
          </label>
        </div>

        {app.prv.err ? <div className={css.alert}>{app.prv.err}</div> : null}

        {app.prv.load ? (
          <div className={ui.load}>
            <Loader2 className={ui.spin} size={14} />
            正在加载模型目录...
          </div>
        ) : app.stats.providers === 0 ? (
          <div className={css.empty}>
            还没有已连接的 provider。
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={props.onProviders}>
              去连接
            </button>
          </div>
        ) : app.groups.length === 0 ? (
          <div className={css.empty}>没有匹配的模型。</div>
        ) : (
          <div className={css.catalog}>
            {app.groups.map((group, idx) => {
              const all = group.items.every((item) =>
                app.visible({ providerID: item.provider.id, modelID: item.id }, item),
              )
              const show = query || (open[group.id] ?? idx === 0)

              return (
                <div key={group.id} className={css.group}>
                  <div className={css.titleline}>
                    <button
                      type="button"
                      className={css.groupbtn}
                      aria-expanded={show}
                      onClick={() => setOpen((prev) => ({ ...prev, [group.id]: !show }))}
                    >
                      <ChevronDown className={show ? css.turn : ""} size={14} />
                      <span>{group.name}</span>
                      <em>{group.items.length} 个模型</em>
                    </button>
                    {show ? (
                      <Switch
                        label="全部"
                        checked={all}
                        onChange={(on) =>
                          group.items.forEach((item) => {
                            app.show({ providerID: item.provider.id, modelID: item.id }, on)
                          })
                        }
                      />
                    ) : null}
                  </div>

                  {show ? (
                    <div className={css.rows}>
                      {group.items.map((item) => {
                        const on = app.visible({ providerID: item.provider.id, modelID: item.id }, item)

                        return (
                          <article key={`${item.provider.id}:${item.id}`} className={css.row}>
                            <div className={css.info}>
                              <div className={css.line}>
                                <strong>{item.name}</strong>
                                <span>{item.id}</span>
                                {item.def ? <span>默认</span> : null}
                                {app.latest.has(modelKey({ providerID: item.provider.id, modelID: item.id })) ? (
                                  <span>最新</span>
                                ) : null}
                                {item.free ? <span>免费</span> : null}
                              </div>
                              <div className={css.meta}>
                                <span>上下文 {item.limit.context.toLocaleString()}</span>
                                <span>{item.capabilities?.reasoning ? "支持推理" : "不支持推理"}</span>
                                <span>{item.capabilities?.toolcall ? "支持工具" : "不支持工具"}</span>
                              </div>
                            </div>
                            <Switch
                              label={on ? "显示中" : "已隐藏"}
                              checked={on}
                              onChange={(next) => app.show({ providerID: item.provider.id, modelID: item.id }, next)}
                            />
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
