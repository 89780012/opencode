import type { ThemeAccent } from "@/types/system"

type Accent = {
  key: ThemeAccent
  title: string
  text: string
  swatch: string[]
  light: {
    primary: string
    ring: string
    sidebar: string
  }
  dark: {
    primary: string
    ring: string
    sidebar: string
  }
}

export const accents: Accent[] = [
  {
    key: "ocean",
    title: "海蓝",
    text: "偏理性、偏工具化，适合作为默认工作台风格。",
    swatch: ["#2f6fed", "#52a7ff", "#d9ebff"],
    light: {
      primary: "oklch(0.58 0.16 249)",
      ring: "oklch(0.68 0.11 249)",
      sidebar: "oklch(0.52 0.16 249)",
    },
    dark: {
      primary: "oklch(0.74 0.12 249)",
      ring: "oklch(0.64 0.09 249)",
      sidebar: "oklch(0.68 0.14 249)",
    },
  },
  {
    key: "forest",
    title: "松绿",
    text: "更沉稳，适合运行监控和长时间盯日志场景。",
    swatch: ["#147a5f", "#26b388", "#d8f8eb"],
    light: {
      primary: "oklch(0.56 0.13 170)",
      ring: "oklch(0.67 0.08 170)",
      sidebar: "oklch(0.5 0.12 170)",
    },
    dark: {
      primary: "oklch(0.73 0.1 170)",
      ring: "oklch(0.63 0.07 170)",
      sidebar: "oklch(0.68 0.1 170)",
    },
  },
  {
    key: "ember",
    title: "琥珀",
    text: "强调感更强，适合把操作按钮和提醒状态做得更醒目。",
    swatch: ["#d36b16", "#ff9d45", "#fff0dc"],
    light: {
      primary: "oklch(0.68 0.14 55)",
      ring: "oklch(0.76 0.1 55)",
      sidebar: "oklch(0.62 0.14 55)",
    },
    dark: {
      primary: "oklch(0.78 0.1 55)",
      ring: "oklch(0.68 0.08 55)",
      sidebar: "oklch(0.73 0.11 55)",
    },
  },
  {
    key: "rose",
    title: "玫瑰",
    text: "适合把设置页和管理页做得更柔和，但仍保留足够识别度。",
    swatch: ["#c74b76", "#ee7aa4", "#ffe0ea"],
    light: {
      primary: "oklch(0.64 0.16 1)",
      ring: "oklch(0.72 0.11 1)",
      sidebar: "oklch(0.58 0.16 1)",
    },
    dark: {
      primary: "oklch(0.76 0.11 1)",
      ring: "oklch(0.66 0.08 1)",
      sidebar: "oklch(0.7 0.11 1)",
    },
  },
  {
    key: "graphite",
    title: "石墨",
    text: "极简克制，适合希望系统色彩尽量收敛的工作环境。",
    swatch: ["#46505c", "#7a8695", "#dce3ea"],
    light: {
      primary: "oklch(0.44 0.02 255)",
      ring: "oklch(0.62 0.02 255)",
      sidebar: "oklch(0.38 0.02 255)",
    },
    dark: {
      primary: "oklch(0.82 0.01 255)",
      ring: "oklch(0.7 0.01 255)",
      sidebar: "oklch(0.76 0.01 255)",
    },
  },
]

export function applyAccent(key: ThemeAccent) {
  const root = document.documentElement
  const item = accents.find((item) => item.key === key) ?? accents[0]

  root.style.setProperty("--accent-primary", item.light.primary)
  root.style.setProperty("--accent-ring", item.light.ring)
  root.style.setProperty("--accent-sidebar", item.light.sidebar)
  root.style.setProperty("--accent-primary-dark", item.dark.primary)
  root.style.setProperty("--accent-ring-dark", item.dark.ring)
  root.style.setProperty("--accent-sidebar-dark", item.dark.sidebar)
}
