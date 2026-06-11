import { Box, Cpu } from "lucide-react"
import { useState } from "react"
import { ConnectDialog } from "../dialogs/connect"
import { CustomDialog } from "../dialogs/custom"
import { useSettings } from "../hooks/use-settings"
import { ModelsPanel } from "../panels/models"
import { ProvidersPanel } from "../panels/providers"
import css from "../styles/settings.module.css"
import type { Tab } from "../types"

const tabs = [
  { key: "providers", icon: Box, label: "提供商" },
  { key: "models", icon: Cpu, label: "模型" },
] as const

export function SettingsContent() {
  const app = useSettings()
  const [tab, setTab] = useState<Tab>("providers")

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
                  className={`${css.navbtn} ${tab === item.key ? css.navon : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className={css.main}>
          {tab === "providers" ? <ProvidersPanel app={app} /> : <ModelsPanel app={app} onProviders={() => setTab("providers")} />}
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
