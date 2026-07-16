import { Box, ChartColumn, Cpu, Settings2 } from "lucide-react"
import { ConnectDialog } from "../dialogs/connect"
import { CustomDialog } from "../dialogs/custom"
import { useSettings } from "../hooks/use-settings"
import { BacktestPanel } from "../panels/backtest"
import { ModelsPanel } from "../panels/models"
import { ProvidersPanel } from "../panels/providers"
import { SystemPanel } from "../panels/system"
import css from "../styles/settings.module.css"
import type { Tab } from "../types"

const tabs = [
  { key: "providers", icon: Box, label: "提供商" },
  { key: "models", icon: Cpu, label: "模型" },
  { key: "backtest", icon: ChartColumn, label: "回测配置" },
  { key: "system", icon: Settings2, label: "系统" },
] as const

export function SettingsContent(props: { tab: Tab; onTab: (tab: Tab) => void }) {
  const app = useSettings()

  return (
    <>
      <div className={css.shell}>
        <aside className={css.side}>
          <div className={css.logo}>配置项</div>
          <div className={css.nav}>
            {tabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${css.navbtn} ${props.tab === item.key ? css.navon : ""}`}
                  onClick={() => props.onTab(item.key)}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className={css.main}>
          {props.tab === "providers" ? <ProvidersPanel app={app} /> : null}
          {props.tab === "models" ? <ModelsPanel app={app} onProviders={() => props.onTab("providers")} /> : null}
          {props.tab === "backtest" ? <BacktestPanel /> : null}
          {props.tab === "system" ? <SystemPanel /> : null}
        </main>
      </div>

      <ConnectDialog
        open={!!app.page.item}
        item={app.page.item}
        list={app.page.item ? app.page.list[app.page.item.id] : undefined}
        onOpenChange={(open) => {
          if (!open) app.page.setItem(undefined)
        }}
        onDone={async () => {
          await app.page.refresh()
        }}
      />

      <CustomDialog
        open={app.page.customOpen}
        ids={app.page.ids}
        cfg={app.page.config}
        onOpenChange={app.page.setCustomOpen}
        onDone={async () => {
          await app.page.refresh()
        }}
      />
    </>
  )
}
