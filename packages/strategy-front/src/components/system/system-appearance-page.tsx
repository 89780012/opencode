import { Check, Loader2, Monitor, Moon, Palette, Sun } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useSystem } from "@/components/system/system-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { accents } from "@/lib/system-theme"
import type { ThemeAccent, ThemeMode } from "@/types/system"

const modes: { icon: typeof Monitor; key: ThemeMode; title: string; text: string }[] = [
  {
    icon: Monitor,
    key: "system",
    title: "跟随系统",
    text: "使用 Windows 系统深浅色偏好，适合桌面端长期使用。",
  },
  {
    icon: Sun,
    key: "light",
    title: "浅色",
    text: "保持高亮、清爽的工作台视觉，更适合白天阅读和表格密集场景。",
  },
  {
    icon: Moon,
    key: "dark",
    title: "深色",
    text: "降低眩光，适合长时间盯盘、日志排查和夜间运行观察。",
  },
]

export function SystemAppearancePage() {
  const sys = useSystem()
  const [busy, setBusy] = useState("")

  async function save(mode: ThemeMode, accent: ThemeAccent) {
    const key = `${mode}:${accent}`
    setBusy(key)
    try {
      await sys.save({
        ...sys.cfg,
        theme: {
          mode,
          accent,
        },
      })
      toast.success("系统外观已保存")
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary rounded-2xl p-3">
                <Palette className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>外观设置</CardTitle>
                <CardDescription>主题模式负责深浅色，主题色负责主要按钮、侧边栏强调色和系统反馈焦点。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-3">
              {modes.map((item) => {
                const active = sys.cfg.theme.mode === item.key
                const lock = busy === `${item.key}:${sys.cfg.theme.accent}`
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => void save(item.key, sys.cfg.theme.accent)}
                    className={`rounded-3xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40"}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="bg-muted rounded-2xl p-2">
                        <item.icon className="size-4" />
                      </div>
                      {lock ? (
                        <Loader2 className="text-primary size-4 animate-spin" />
                      ) : active ? (
                        <Check className="text-primary size-4" />
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">{item.text}</p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-3xl border p-4">
              <div className="text-sm font-semibold">实时预览</div>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                这里的颜色会跟随你刚刚保存的系统配置变化，方便确认侧边栏与主按钮的视觉效果。
              </p>
              <div className="bg-card rounded-[24px] border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Strategy Service</div>
                    <div className="text-muted-foreground text-xs">系统设置预览卡片</div>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs">主色</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>主题色</CardTitle>
            <CardDescription>用预设色板控制一致性，避免随意色值把浅色和深色模式拉散。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-2 xl:grid-cols-5">
            {accents.map((item) => {
              const active = sys.cfg.theme.accent === item.key
              const lock = busy === `${sys.cfg.theme.mode}:${item.key}`
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => void save(sys.cfg.theme.mode, item.key)}
                  className={`rounded-3xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40"}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-2">
                      {item.swatch.map((tone) => (
                        <span key={tone} className="size-6 rounded-full border" style={{ backgroundColor: tone }} />
                      ))}
                    </div>
                    {lock ? (
                      <Loader2 className="text-primary size-4 animate-spin" />
                    ) : active ? (
                      <Check className="text-primary size-4" />
                    ) : null}
                  </div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">{item.text}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
