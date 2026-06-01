import type { ReactNode } from "react"
import { Ctx, useGlobalDataValue } from "@/data/global-data"

export function GlobalDataProvider(props: { children: ReactNode }) {
  const value = useGlobalDataValue()
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}
