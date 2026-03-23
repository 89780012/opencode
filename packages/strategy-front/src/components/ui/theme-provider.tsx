import type { ReactNode } from "react"
import { ThemeProvider as NextThemeProvider } from "next-themes"

export function ThemeProvider(props: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {props.children}
    </NextThemeProvider>
  )
}
