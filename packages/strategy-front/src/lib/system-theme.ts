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
      primary: "47 111 237",
      ring: "82 167 255",
      sidebar: "37 99 235",
    },
    dark: {
      primary: "96 165 250",
      ring: "125 211 252",
      sidebar: "59 130 246",
    },
  },
  {
    key: "forest",
    title: "松绿",
    text: "更沉稳，适合运行监控和长时间盯日志的场景。",
    swatch: ["#147a5f", "#26b388", "#d8f8eb"],
    light: {
      primary: "20 122 95",
      ring: "38 179 136",
      sidebar: "16 102 79",
    },
    dark: {
      primary: "74 222 128",
      ring: "52 211 153",
      sidebar: "22 163 74",
    },
  },
  {
    key: "ember",
    title: "琥珀",
    text: "强调感更强，适合把操作按钮和提醒状态做得更醒目。",
    swatch: ["#d36b16", "#ff9d45", "#fff0dc"],
    light: {
      primary: "211 107 22",
      ring: "255 157 69",
      sidebar: "194 98 27",
    },
    dark: {
      primary: "251 191 36",
      ring: "253 224 71",
      sidebar: "245 158 11",
    },
  },
  {
    key: "rose",
    title: "玫瑰",
    text: "适合把设置页和管理页做得更柔和，但仍保留足够识别度。",
    swatch: ["#c74b76", "#ee7aa4", "#ffe0ea"],
    light: {
      primary: "199 75 118",
      ring: "238 122 164",
      sidebar: "190 24 93",
    },
    dark: {
      primary: "244 114 182",
      ring: "251 182 206",
      sidebar: "225 29 72",
    },
  },
  {
    key: "graphite",
    title: "石墨",
    text: "极简克制，适合希望系统色彩尽量收敛的工作环境。",
    swatch: ["#46505c", "#7a8695", "#dce3ea"],
    light: {
      primary: "70 80 92",
      ring: "122 134 149",
      sidebar: "51 65 85",
    },
    dark: {
      primary: "203 213 225",
      ring: "148 163 184",
      sidebar: "100 116 139",
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
